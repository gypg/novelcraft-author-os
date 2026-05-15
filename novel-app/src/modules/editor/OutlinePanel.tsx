import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOutlineStore } from './outline-store'
import type { OutlineTreeNode } from '@/core/db/outline-repository'

interface OutlinePanelProps {
  bookId: string
}

export function OutlinePanel({ bookId }: OutlinePanelProps) {
  const { tree, addNode, deleteNode, updateNode } = useOutlineStore()
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const navigate = useNavigate()

  const handleAdd = async (parentId: string | null) => {
    if (!newTitle.trim()) return
    await addNode(parentId, newTitle.trim())
    setNewTitle('')
    setAddingTo(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('删除此节点及其所有子节点？')) return
    await deleteNode(id)
  }

  const startEdit = (node: OutlineTreeNode) => {
    setEditingId(node.id)
    setEditTitle(node.title)
    setEditDesc(node.description)
  }

  const saveEdit = async (id: string) => {
    await updateNode(id, { title: editTitle, description: editDesc })
    setEditingId(null)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>大纲</span>
        <button
          onClick={() => { setAddingTo(null); setNewTitle('') }}
          style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--app-radius)', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          + 添加
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {tree.length === 0 && addingTo === null && (
          <div style={{ fontSize: '11px', textAlign: 'center', padding: '24px 0', color: 'var(--app-text-muted)' }}>
            点击「+ 添加」创建大纲节点
          </div>
        )}

        {tree.map((node) => (
          <OutlineTreeNodeComponent
            key={node.id}
            node={node}
            level={0}
            editingId={editingId}
            editTitle={editTitle}
            editDesc={editDesc}
            setEditTitle={setEditTitle}
            setEditDesc={setEditDesc}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingId(null)}
            onDelete={handleDelete}
            onAddChild={(parentId) => { setAddingTo(parentId); setNewTitle('') }}
            addingTo={addingTo}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            onConfirmAdd={handleAdd}
            onCancelAdd={() => setAddingTo(null)}
            onNavigate={(chapterId) => navigate('/editor', { state: { bookId, chapterId } })}
          />
        ))}

        {addingTo === null && tree.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd(null)}
              placeholder="节点标题..."
              autoFocus
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: 'var(--app-radius)',
                fontSize: '11px',
                border: '1px solid var(--app-border)',
                background: 'var(--app-input-bg)',
                color: 'var(--app-text-primary)',
                outline: 'none',
              }}
            />
            <button onClick={() => handleAdd(null)} style={{ fontSize: '11px', padding: '0 4px', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
            <button onClick={() => setAddingTo(null)} style={{ fontSize: '11px', padding: '0 4px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        )}
      </div>
    </div>
  )
}

function OutlineTreeNodeComponent(props: {
  node: OutlineTreeNode
  level: number
  editingId: string | null
  editTitle: string
  editDesc: string
  setEditTitle: (v: string) => void
  setEditDesc: (v: string) => void
  onStartEdit: (node: OutlineTreeNode) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  addingTo: string | null
  newTitle: string
  setNewTitle: (v: string) => void
  onConfirmAdd: (parentId: string | null) => void
  onCancelAdd: () => void
  onNavigate: (chapterId: string) => void
}) {
  const { node, level, editingId } = props
  const isEditing = editingId === node.id
  const isAddingChild = props.addingTo === node.id

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 0',
          borderRadius: 'var(--app-radius)',
          fontSize: '11px',
          paddingLeft: `${level * 16 + 4}px`,
        }}
      >
        {isEditing ? (
          <>
            <input
              value={props.editTitle}
              onChange={(e) => props.setEditTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '2px 4px',
                borderRadius: 'var(--app-radius-sm)',
                border: '1px solid var(--app-border)',
                background: 'var(--app-input-bg)',
                color: 'var(--app-text-primary)',
                fontSize: '11px',
                outline: 'none',
              }}
              autoFocus
            />
            <button onClick={() => props.onSaveEdit(node.id)} style={{ fontSize: '10px', padding: '0 4px', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
            <button onClick={props.onCancelEdit} style={{ fontSize: '10px', padding: '0 4px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </>
        ) : (
          <>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                color: 'var(--app-text-primary)',
              }}
              onClick={() => node.chapter_id && props.onNavigate(node.chapter_id)}
            >
              {node.title}
            </span>

            {node.chapter_id ? (
              <span style={{ fontSize: '9px', padding: '0 4px', borderRadius: 'var(--app-radius)', backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-muted)', flexShrink: 0 }}>
                已关联
              </span>
            ) : (
              <span style={{ fontSize: '9px', padding: '0 4px', borderRadius: 'var(--app-radius)', color: 'var(--app-text-muted)', opacity: 0.4, flexShrink: 0 }}>
                未关联
              </span>
            )}

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0, opacity: 0, transition: 'opacity 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0' }}
            >
              <button onClick={() => props.onAddChild(node.id)} title="添加子节点" style={{ fontSize: '10px', padding: '0 2px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
              <button onClick={() => props.onStartEdit(node)} title="编辑" style={{ fontSize: '10px', padding: '0 2px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✎</button>
              <button onClick={() => props.onDelete(node.id)} title="删除" style={{ fontSize: '10px', padding: '0 2px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </span>
          </>
        )}
      </div>

      {isAddingChild && (
        <div style={{ display: 'flex', gap: '4px', padding: '2px 0', paddingLeft: `${(level + 1) * 16 + 4}px` }}>
          <input
            value={props.newTitle}
            onChange={(e) => props.setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && props.onConfirmAdd(node.id)}
            placeholder="子节点标题..."
            autoFocus
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 'var(--app-radius)',
              fontSize: '11px',
              border: '1px solid var(--app-border)',
              background: 'var(--app-input-bg)',
              color: 'var(--app-text-primary)',
              outline: 'none',
            }}
          />
          <button onClick={() => props.onConfirmAdd(node.id)} style={{ fontSize: '11px', padding: '0 4px', color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
          <button onClick={props.onCancelAdd} style={{ fontSize: '11px', padding: '0 4px', color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {node.children.map((child) => (
        <OutlineTreeNodeComponent
          key={child.id}
          node={child}
          level={level + 1}
          editingId={props.editingId}
          editTitle={props.editTitle}
          editDesc={props.editDesc}
          setEditTitle={props.setEditTitle}
          setEditDesc={props.setEditDesc}
          onStartEdit={props.onStartEdit}
          onSaveEdit={props.onSaveEdit}
          onCancelEdit={props.onCancelEdit}
          onDelete={props.onDelete}
          onAddChild={props.onAddChild}
          addingTo={props.addingTo}
          newTitle={props.newTitle}
          setNewTitle={props.setNewTitle}
          onConfirmAdd={props.onConfirmAdd}
          onCancelAdd={props.onCancelAdd}
          onNavigate={props.onNavigate}
        />
      ))}
    </div>
  )
}
