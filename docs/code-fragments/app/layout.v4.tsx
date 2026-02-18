'use client';
import dynamic from 'next/dynamic';

const GameBoard = dynamic(() => import('@/components/gameboard'), { ssr: false });

export default function Home() {
  return <GameBoard />;
}