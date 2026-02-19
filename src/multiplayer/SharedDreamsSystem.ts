/**
 * SharedDreamsSystem — Multiplayer anchor sync and shared corruption state
 *
 * Implements WebRTC DataChannel for peer-to-peer AR anchor and tension sync.
 * Allows multiple players to share the same AR-anchored Platter and Sphere.
 *
 * Architecture:
 * - WebRTC DataChannel for P2P communication (anchor @ 10 Hz, tension @ 30 Hz)
 * - WebSocket signaling server for peer discovery and ICE candidate relay
 * - 200ms latency tolerance via position interpolation
 * - Remote platter rendering with glass-shard overlay
 * - Shared corruption increases local tension by 0.01
 *
 * Requirements: Req 23, Req 41
 * Source: ARCH v3.8
 */

import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { TensionSystem } from '../systems/TensionSystem';

/**
 * Message types for WebRTC DataChannel
 */
interface AnchorSyncMessage {
  type: 'anchor';
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion [x, y, z, w]
  timestamp: number;
}

interface TensionSyncMessage {
  type: 'tension';
  tension: number;
  coherence: number;
  timestamp: number;
}

type SyncMessage = AnchorSyncMessage | TensionSyncMessage;

/**
 * Remote platter state for interpolation
 */
interface RemotePlatterState {
  mesh: Mesh;
  targetPosition: Vector3;
  targetRotation: Quaternion;
  lastMessageTime: number;
  alpha: number; // fade alpha for disconnect detection
}

/**
 * SharedDreamsSystem singleton
 *
 * Manages WebRTC peer connection, anchor/tension sync, and remote platter rendering.
 */
export class SharedDreamsSystem {
  private static instance: SharedDreamsSystem | null = null;

  private scene: Scene | null = null;
  private tensionSystem: TensionSystem | null = null;
  private localPlatterMesh: Mesh | null = null;

  // WebRTC
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingSocket: WebSocket | null = null;
  private peerId: string | null = null;
  private remotePeerId: string | null = null;

  // Remote platter
  private remotePlatter: RemotePlatterState | null = null;

  // Sync intervals
  private anchorSyncInterval: number | null = null; // 10 Hz = 100ms
  private tensionSyncInterval: number | null = null; // 30 Hz = 33ms

  // Latency tolerance
  private readonly INTERPOLATION_WINDOW_MS = 200;
  private readonly FADE_TIMEOUT_MS = 500;
  private readonly DISCONNECT_TIMEOUT_MS = 2000;

  private constructor() {}

  static getInstance(): SharedDreamsSystem {
    if (!SharedDreamsSystem.instance) {
      SharedDreamsSystem.instance = new SharedDreamsSystem();
    }
    return SharedDreamsSystem.instance;
  }

  /**
   * Initialize the system with scene, tension system, and local platter mesh
   */
  initialize(scene: Scene, tensionSystem: TensionSystem, localPlatterMesh: Mesh): void {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
    this.localPlatterMesh = localPlatterMesh;
  }

  /**
   * Connect to signaling server and establish WebRTC peer connection
   * @param signalingServerUrl WebSocket URL for signaling server
   * @param roomId Shared seed string for room creation
   */
  async connect(signalingServerUrl: string, roomId: string): Promise<void> {
    if (!this.scene || !this.tensionSystem || !this.localPlatterMesh) {
      throw new Error('SharedDreamsSystem not initialized');
    }

    // Generate peer ID
    this.peerId = `peer-${Math.random().toString(36).substring(2, 11)}`;

    // Connect to signaling server
    this.signalingSocket = new WebSocket(signalingServerUrl);

    this.signalingSocket.onopen = () => {
      // Join room
      this.signalingSocket?.send(
        JSON.stringify({
          type: 'join',
          roomId,
          peerId: this.peerId,
        }),
      );
    };

    this.signalingSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await this.handleSignalingMessage(message);
    };

    this.signalingSocket.onerror = (error) => {
      console.error('Signaling socket error:', error);
    };

    this.signalingSocket.onclose = () => {
      console.log('Signaling socket closed');
      this.disconnect();
    };
  }

  /**
   * Handle signaling server messages (offer/answer/ICE candidates)
   */
  // biome-ignore lint/suspicious/noExplicitAny: Signaling message types are dynamic and not fully typed
  private async handleSignalingMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'peer-joined':
        // Another peer joined the room — create offer
        this.remotePeerId = message.peerId;
        await this.createOffer();
        break;

      case 'offer':
        // Received offer from peer — create answer
        this.remotePeerId = message.from;
        await this.handleOffer(message.offer);
        break;

      case 'answer':
        // Received answer from peer — set remote description
        await this.handleAnswer(message.answer);
        break;

      case 'ice-candidate':
        // Received ICE candidate from peer
        await this.handleIceCandidate(message.candidate);
        break;

      default:
        console.warn('Unknown signaling message type:', message.type);
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private createPeerConnection(): void {
    // STUN servers for NAT traversal
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    });

    // ICE candidate event
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingSocket) {
        this.signalingSocket.send(
          JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            to: this.remotePeerId,
            from: this.peerId,
          }),
        );
      }
    };

    // Connection state change
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected') {
        this.handlePeerDisconnect();
      }
    };
  }

  /**
   * Create offer and send to peer
   */
  private async createOffer(): Promise<void> {
    this.createPeerConnection();

    // Create data channel
    const channel = this.peerConnection?.createDataChannel('shared-dreams');
    if (!channel) {
      throw new Error('Failed to create data channel');
    }
    this.dataChannel = channel;
    this.setupDataChannel();

    // Create offer
    const offer = await this.peerConnection?.createOffer();
    await this.peerConnection?.setLocalDescription(offer);

    // Send offer to peer via signaling server
    this.signalingSocket?.send(
      JSON.stringify({
        type: 'offer',
        offer,
        to: this.remotePeerId,
        from: this.peerId,
      }),
    );
  }

  /**
   * Handle offer from peer and create answer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.createPeerConnection();

    // Set remote description
    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await this.peerConnection?.createAnswer();
    await this.peerConnection?.setLocalDescription(answer);

    // Send answer to peer via signaling server
    this.signalingSocket?.send(
      JSON.stringify({
        type: 'answer',
        answer,
        to: this.remotePeerId,
        from: this.peerId,
      }),
    );

    // Listen for data channel from peer
    // biome-ignore lint/style/noNonNullAssertion: peerConnection is guaranteed to exist at this point
    this.peerConnection!.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  /**
   * Handle answer from peer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Handle ICE candidate from peer
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.startSyncIntervals();
    };

    this.dataChannel.onmessage = (event) => {
      const message: SyncMessage = JSON.parse(event.data);
      this.handleSyncMessage(message);
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.stopSyncIntervals();
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  /**
   * Start anchor and tension sync intervals
   */
  private startSyncIntervals(): void {
    // Anchor sync @ 10 Hz (100ms)
    this.anchorSyncInterval = window.setInterval(() => {
      this.sendAnchorSync();
    }, 100);

    // Tension sync @ 30 Hz (33ms)
    this.tensionSyncInterval = window.setInterval(() => {
      this.sendTensionSync();
    }, 33);
  }

  /**
   * Stop sync intervals
   */
  private stopSyncIntervals(): void {
    if (this.anchorSyncInterval !== null) {
      window.clearInterval(this.anchorSyncInterval);
      this.anchorSyncInterval = null;
    }
    if (this.tensionSyncInterval !== null) {
      window.clearInterval(this.tensionSyncInterval);
      this.tensionSyncInterval = null;
    }
  }

  /**
   * Send anchor sync message (position + rotation)
   */
  private sendAnchorSync(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open' || !this.localPlatterMesh) {
      return;
    }

    const position = this.localPlatterMesh.position;
    const rotation = this.localPlatterMesh.rotationQuaternion || Quaternion.Identity();

    const message: AnchorSyncMessage = {
      type: 'anchor',
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      timestamp: performance.now(),
    };

    this.dataChannel.send(JSON.stringify(message));
  }

  /**
   * Send tension sync message
   */
  private sendTensionSync(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open' || !this.tensionSystem) {
      return;
    }

    const message: TensionSyncMessage = {
      type: 'tension',
      tension: this.tensionSystem.currentTension,
      coherence: 0, // Placeholder — coherence moved to TensionSystem in v3.0
      timestamp: performance.now(),
    };

    this.dataChannel.send(JSON.stringify(message));
  }

  /**
   * Handle incoming sync messages
   */
  private handleSyncMessage(message: SyncMessage): void {
    const now = performance.now();

    switch (message.type) {
      case 'anchor':
        this.handleAnchorSync(message, now);
        break;

      case 'tension':
        this.handleTensionSync(message, now);
        break;

      default:
        // biome-ignore lint/suspicious/noExplicitAny: Unknown message types need dynamic access
        console.warn('Unknown sync message type:', (message as any).type);
    }
  }

  /**
   * Handle anchor sync message — update remote platter position/rotation
   */
  private handleAnchorSync(message: AnchorSyncMessage, now: number): void {
    if (!this.scene) return;

    // Create remote platter if it doesn't exist
    if (!this.remotePlatter) {
      this.createRemotePlatter();
    }

    if (!this.remotePlatter) return;

    // Update target position and rotation
    this.remotePlatter.targetPosition = new Vector3(message.position[0], message.position[1], message.position[2]);
    this.remotePlatter.targetRotation = new Quaternion(
      message.rotation[0],
      message.rotation[1],
      message.rotation[2],
      message.rotation[3],
    );
    this.remotePlatter.lastMessageTime = now;

    // Reset alpha (peer is active)
    this.remotePlatter.alpha = 1.0;
  }

  /**
   * Handle tension sync message — increase local tension by 0.01 for shared corruption
   */
  private handleTensionSync(_message: TensionSyncMessage, now: number): void {
    if (!this.tensionSystem) return;

    // Shared corruption: increase local tension by 0.01 (Req 23.3)
    this.tensionSystem.increase(0.01);

    // Update last message time for disconnect detection
    if (this.remotePlatter) {
      this.remotePlatter.lastMessageTime = now;
    }
  }

  /**
   * Create remote platter mesh with glass-shard overlay
   */
  private createRemotePlatter(): void {
    if (!this.scene) return;

    // Create cylinder mesh (same dimensions as local platter)
    const mesh = MeshBuilder.CreateCylinder(
      'remotePlatter',
      {
        height: 0.18,
        diameter: 1.2,
        tessellation: 64,
      },
      this.scene,
    );

    // Glass-shard overlay material (faint, semi-transparent)
    const material = new StandardMaterial('remotePlatterMaterial', this.scene);
    material.diffuseColor = new Color3(0.8, 0.9, 1.0); // Faint blue-white
    material.specularColor = new Color3(0.5, 0.5, 0.5);
    material.alpha = 0.3; // Semi-transparent (Req 23.2)
    mesh.material = material;

    this.remotePlatter = {
      mesh,
      targetPosition: Vector3.Zero(),
      targetRotation: Quaternion.Identity(),
      lastMessageTime: performance.now(),
      alpha: 1.0,
    };
  }

  /**
   * Update remote platter interpolation and disconnect detection
   * Call this in the render loop
   */
  update(): void {
    if (!this.remotePlatter) return;

    const now = performance.now();
    const timeSinceLastMessage = now - this.remotePlatter.lastMessageTime;

    // Disconnect detection
    if (timeSinceLastMessage > this.DISCONNECT_TIMEOUT_MS) {
      // Peer disconnected — dispose remote platter
      this.disposeRemotePlatter();
      return;
    }

    // Fade detection
    if (timeSinceLastMessage > this.FADE_TIMEOUT_MS) {
      // No message for 500ms — fade to alpha 0.3
      this.remotePlatter.alpha = 0.3;
    } else {
      // Peer active — full alpha
      this.remotePlatter.alpha = 1.0;
    }

    // Update material alpha
    const material = this.remotePlatter.mesh.material as StandardMaterial;
    if (material) {
      material.alpha = 0.3 * this.remotePlatter.alpha; // Base alpha 0.3 × fade multiplier
    }

    // Interpolate position over 200ms window (Req 41.4)
    const t = Math.min(1.0, 1.0 / (this.INTERPOLATION_WINDOW_MS / 16.67)); // ~16.67ms per frame @ 60fps
    this.remotePlatter.mesh.position = Vector3.Lerp(
      this.remotePlatter.mesh.position,
      this.remotePlatter.targetPosition,
      t,
    );

    // Interpolate rotation
    if (!this.remotePlatter.mesh.rotationQuaternion) {
      this.remotePlatter.mesh.rotationQuaternion = Quaternion.Identity();
    }
    this.remotePlatter.mesh.rotationQuaternion = Quaternion.Slerp(
      this.remotePlatter.mesh.rotationQuaternion,
      this.remotePlatter.targetRotation,
      t,
    );
  }

  /**
   * Dispose remote platter mesh
   */
  private disposeRemotePlatter(): void {
    if (this.remotePlatter) {
      this.remotePlatter.mesh.dispose();
      this.remotePlatter = null;
    }
  }

  /**
   * Handle peer disconnect
   */
  private handlePeerDisconnect(): void {
    console.log('Peer disconnected');
    this.stopSyncIntervals();
    this.disposeRemotePlatter();
  }

  /**
   * Disconnect from peer and signaling server
   */
  disconnect(): void {
    this.stopSyncIntervals();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }

    this.disposeRemotePlatter();

    this.peerId = null;
    this.remotePeerId = null;
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.disconnect();
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.disconnect();
    this.scene = null;
    this.tensionSystem = null;
    this.localPlatterMesh = null;
  }
}
