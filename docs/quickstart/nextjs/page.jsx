// app/[...slug]/page.jsx
'use client'
import { useState, useEffect } from 'react'
import { initBridge } from 'hydra-js'

export default function Page({ params }) {
  const [page, setPage] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    // Only init bridge when loaded inside the editor
    if (window.name.startsWith('hydra')) {
      setEditing(true)
      initBridge({
        // Register custom block types with their field schemas
        blocks: {
          card: { blockSchema: { properties: {
            image: { widget: 'image' },
            title: { type: 'string' },
            description: { type: 'string' },
            link: { widget: 'url' },
          }}}
        },
        // Receive live updates as editor changes content
        onEditChange: setPage
      })
    } else {
      fetch(`/++api++/${params.slug?.join('/') || ''}`)
        .then(r => r.json()).then(setPage)
    }
  }, [])

  if (!page) return <div>Loading...</div>

  return page.blocks_layout?.items?.map(id => {
    const block = page.blocks[id]
    return (
      // data-block-uid: makes block selectable, draggable, and editable
      <div key={id} data-block-uid={editing ? id : undefined}>
        {/* data-edit-link: click to edit link URL in sidebar */}
        <a href={block.link}
           data-edit-link={editing ? 'link' : undefined}>
          {/* data-edit-media: click to pick/upload image in sidebar */}
          <img src={block.image}
               data-edit-media={editing ? 'image' : undefined} />
          {/* data-edit-text: edit text directly in the preview */}
          <h3 data-edit-text={editing ? 'title' : undefined}>
            {block.title}
          </h3>
          <p data-edit-text={editing ? 'description' : undefined}>
            {block.description}
          </p>
        </a>
      </div>
    )
  })
}
