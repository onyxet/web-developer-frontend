import Blockies from 'react-blockies'

interface AvatarProps {
  address: string
  size?: number
}

export const Avatar = ({ address, size = 8 }: AvatarProps) => {
  return (
    <div style={{
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-block',
      border: '2px solid #000'
    }}>
      <Blockies
        seed={address.toLowerCase()}
        size={size}
        scale={4}
      />
    </div>
  )
}
