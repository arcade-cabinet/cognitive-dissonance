/**
 * ECS React Bindings
 *
 * Creates React context and hooks for miniplex world access.
 * Components use these hooks to reactively query entities.
 */

import createReactAPI from 'miniplex-react';
import { type Entity, world } from './world';

export const ECS = createReactAPI<Entity>(world);
