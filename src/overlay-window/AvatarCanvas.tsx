import { useEffect } from 'react'
import { useRive } from '@rive-app/react-canvas'
import { StateMachineInputType } from '@rive-app/canvas'
import defaultAvatarSrc from '../../assets/avatars/default.riv?url'

export type AvatarPhase = 'idle' | 'enter' | 'talk' | 'exit' | 'celebrate'

const PHASE_NAMES: AvatarPhase[] = ['idle', 'enter', 'talk', 'exit', 'celebrate']

// Maps AppSettings.avatarId -> bundled .riv asset. Only "default" exists for
// now (a placeholder file); add entries here as real character assets land.
const AVATARS: Record<string, string> = {
  default: defaultAvatarSrc
}

interface Props {
  avatarId: string
  phase: AvatarPhase
}

/**
 * Renders the avatar's Rive canvas and drives it to match `phase`.
 *
 * A real character asset is expected to expose a state machine with
 * inputs named "idle"/"enter"/"talk"/"exit" (triggers or booleans), or
 * plain animations with those names — both are picked up automatically
 * here via the loaded file's actual state machine/animation names, no
 * per-avatar code required. Files with neither (e.g. today's placeholder)
 * just autoplay their default animation and ignore phase changes.
 */
export function AvatarCanvas({ avatarId, phase }: Props): JSX.Element {
  const src = AVATARS[avatarId] ?? AVATARS.default
  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true
  })

  useEffect(() => {
    if (!rive) return
    // Best-effort: drives named state-machine inputs/animations when a real
    // character asset provides them. Wrapped defensively because the Rive
    // runtime can throw here for files/versions that don't support a given
    // call (e.g. a state machine with no exposed inputs) — that must never
    // take down the whole overlay, it should just fall back to autoplay.
    try {
      const stateMachineName = rive.stateMachineNames[0]
      if (stateMachineName) {
        for (const input of rive.stateMachineInputs(stateMachineName) ?? []) {
          const inputPhase = input.name.toLowerCase()
          if (!PHASE_NAMES.includes(inputPhase as AvatarPhase)) continue
          if (input.type === StateMachineInputType.Trigger) {
            if (inputPhase === phase) input.fire()
          } else {
            input.value = inputPhase === phase
          }
        }
      } else if (rive.animationNames.includes(phase)) {
        rive.play(phase)
      }
    } catch (err) {
      console.warn('[AvatarCanvas] failed to drive Rive phase, falling back to autoplay', err)
    }
  }, [phase, rive])

  return <RiveComponent className="avatar-canvas" />
}
