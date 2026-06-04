import { Flag } from './Flag'

type Team = {
  name: string
  flag_emoji: string
}

export function TeamInline({ team, mode = 'name' }: { team: Team; mode?: 'name' | 'code' }) {
  return (
    <span className="team">
      <Flag emoji={team.flag_emoji} name={team.name} size={17} />
      <span className={mode === 'name' ? 'tname' : 'tcode'}>
        {team.name}
      </span>
    </span>
  )
}
