import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { SlashCommand } from './registry'

interface SlashCommandListProps {
  items: SlashCommand[]
  command: (item: SlashCommand) => void
}

export interface SlashCommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) {
          command(item)
        }
      },
      [items, command],
    )

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }

        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="slash-command-menu">
          <div className="slash-command-item" style={{ color: 'var(--muted-foreground)', cursor: 'default' }}>
            无匹配命令
          </div>
        </div>
      )
    }

    return (
      <div className="slash-command-menu">
        {items.map((item, index) => (
          <button
            key={item.name}
            className={`slash-command-item ${index === selectedIndex ? 'active' : ''}`}
            onClick={() => selectItem(index)}
          >
            <span className="slash-command-item-icon">{item.icon}</span>
            <span className="slash-command-item-label">{item.label}</span>
            <span className="slash-command-item-desc">{item.description}</span>
          </button>
        ))}
      </div>
    )
  },
)

SlashCommandList.displayName = 'SlashCommandList'
