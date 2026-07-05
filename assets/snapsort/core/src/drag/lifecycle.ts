import type { Container } from "../container";
import type { DropCandidate } from "../algorithm";
import type { GhostKind, GhostRect, GhostRole } from "../events";
import type { DragSession } from "./session";

/**
 * The drag/ghost lifecycle for a sort mode. There are exactly two today:
 * a flow-layout spacer ghost that lives in the item list and is FLIP-animated
 * (euclidean/progressive), and a floating insertion marker tracked only via
 * `DragSession.pendingGhostTarget` (insertion). Drop-target *resolution*
 * (which algorithm picks the candidate) is a separate axis — see
 * `DropTargetStrategy` in drop-strategy.ts.
 */
export interface DragLifecycleStrategy {
  readonly ghostKind: GhostKind;

  /** WRITE_1 work specific to starting a drag
   * (ghost creation, detaching the item, styling). */
  dragStart(session: DragSession): void | Promise<void>;

  /** WRITE_1 work specific to a pointer move. */
  dragMove(session: DragSession): void | Promise<void>;

  /** Current container/index the ghost logically occupies,
   * or null when there is none yet. */
  currentGhostLocation(
    session: DragSession,
  ): { container: Container; index: number } | null;

  /** Translate a resolved drop candidate into an
   * index meaningful for this lifecycle's ghost representation. */
  translateTargetIndex(session: DragSession, target: DropCandidate): number;

  /** Move (or create) the ghost/marker to the given container/index. */
  moveGhost(
    session: DragSession,
    container: Container,
    index: number,
    ghostRect: GhostRect | null | undefined,
  ): Promise<void>;

  /** Called after the ghost has been synced to
   * the (possibly unchanged) drop target. */
  afterSyncDropTarget(session: DragSession): void;

  /**
   * Remove the ghost/marker for the given role, if one currently exists.
   * Safe to call at any point during a drag (e.g. when the pointer leaves
   * every valid drop target, or when a drop effect change no longer needs a
   * source-role ghost) — ghosts can be added, moved, or removed independently.
   */
  removeGhost(session: DragSession, role: GhostRole): Promise<void>;

  /** WRITE_1 work for dropping: remove the ghost/marker
   * and move the item to its final position. */
  drop(session: DragSession): void;
}
