import { useRef, useState } from 'react'

export default function MigrationSetup({ onNext }: { onNext: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)

  const addFiles = (incoming: FileList | File[]) => {
    setFiles(current => {
      const next = [...current]
      for (const file of Array.from(incoming)) {
        if (!next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
          next.push(file)
        }
      }
      return next
    })
  }

  return <section className="migration-setup" aria-label="클라우드 이전 준비 입력">
    <div className="migration-form-panel" onPaste={event => {
      if (event.clipboardData.files.length) {
        event.preventDefault()
        addFiles(event.clipboardData.files)
      }
    }}>
      <div className="migration-heading">
        <h2 className="migration-title">클라우드 이전 준비</h2>
        <p>AWS 연결 정보와 프로젝트 파일을 추가해 주세요.</p>
      </div>
      <div className="migration-fields">
        <div className="migration-key-row">
          <label className="migration-field">
            <span className="migration-label">AWS Access Key ID</span>
            <input className="migration-input" type="text" name="accessKeyId" autoComplete="off" placeholder="AKIA..." />
          </label>
          <label className="migration-field">
            <span className="migration-label">AWS Secret Access Key</span>
            <input className="migration-input" type="password" name="secretAccessKey" autoComplete="new-password" placeholder="Secret Access Key" />
          </label>
        </div>
        <label className="migration-field">
          <span className="migration-label">AWS 리전</span>
          <input className="migration-input" type="text" name="region" autoComplete="off" placeholder="예: ap-northeast-2" />
        </label>
        <div className="migration-field">
          <span className="migration-label">소스코드 파일</span>
          <input ref={fileInputRef} className="migration-file-input" type="file" multiple
            aria-label="소스코드 파일 선택"
            onChange={event => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ''
            }} />
          <div className={'migration-upload' + (dragging ? ' is-dragging' : '')}
            role="button" tabIndex={0} aria-label="소스코드 파일 첨부"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={event => { event.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={event => {
              event.preventDefault()
              setDragging(false)
              addFiles(event.dataTransfer.files)
            }}>
            <span className="migration-upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16.5v2A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5v-2" />
              </svg>
            </span>
            <strong>파일을 여기로 끌어오거나 선택하세요</strong>
            <span>클립보드에서 붙여넣기도 가능해요</span>
          </div>
          {files.length > 0 && <ul className="migration-file-list">
            {files.map((file, index) => <li key={file.name + file.lastModified + index}>
              <span className="migration-file-name">{file.name}</span>
              <button type="button" aria-label={file.name + ' 제거'} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
            </li>)}
          </ul>}
        </div>
      </div>
      <div className="migration-footer">
        <button className="migration-next" type="button" onClick={onNext}>
          다음 <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </section>
}
