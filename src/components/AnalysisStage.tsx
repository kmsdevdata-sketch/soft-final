import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

export type AnalysisUpdate = {
  id: string
  stream: 'infrastructure' | 'code'
  progress: number
  key: string
  message: string
  detail: string
}

const DEMO_UPDATES: Array<AnalysisUpdate & { after: number }> = [
  { after: 3200, id: 'infra-vpc', stream: 'infrastructure', progress: 14, key: 'vpc', message: '서울 리전의 VPC와 서브넷을 확인했어요.', detail: 'ap-northeast-2 · 10.0.0.0/16 · Public A/C · Private App A' },
  { after: 3700, id: 'code-compose', stream: 'code', progress: 15, key: 'compose', message: 'Docker Compose 구성을 확인했어요.', detail: '앱과 PostgreSQL 컨테이너가 같은 EC2에서 실행' },
  { after: 4300, id: 'infra-alb', stream: 'infrastructure', progress: 28, key: 'alb', message: '외부 진입 경로를 찾았어요.', detail: 'Internet-facing ALB · HTTPS 443 → HTTP 8080' },
  { after: 5000, id: 'code-app', stream: 'code', progress: 31, key: 'app', message: '앱의 포트와 상태 확인 경로를 확인했어요.', detail: 'HTTP 8080 · /health · 파일 업로드·조회·삭제 API' },
  { after: 5800, id: 'infra-ec2', stream: 'infrastructure', progress: 43, key: 'ec2', message: '프라이빗 앱 서버를 발견했어요.', detail: 'Ubuntu Linux · EC2 t3.small · Docker Compose' },
  { after: 6400, id: 'code-db', stream: 'code', progress: 47, key: 'database', message: 'DB 연결 설정을 확인했어요.', detail: 'DB_HOST=postgres · DB_PORT=5432' },
  { after: 7200, id: 'infra-postgres', stream: 'infrastructure', progress: 61, key: 'postgres', message: '데이터베이스 배치를 확인했어요.', detail: 'PostgreSQL 16 컨테이너 · Docker 내부 TCP 5432 · Named Volume' },
  { after: 7900, id: 'code-s3', stream: 'code', progress: 63, key: 'sdk', message: '오브젝트 저장소 연결 설정을 확인했어요.', detail: 'S3_BUCKET=uploads-demo · S3_REGION=ap-northeast-2' },
  { after: 8600, id: 'infra-s3', stream: 'infrastructure', progress: 74, key: 's3', message: '비공개 S3 버킷을 확인했어요.', detail: '객체 CRUD · 버전 관리 비활성화' },
  { after: 9400, id: 'code-env', stream: 'code', progress: 78, key: 'env', message: '이전 시 바뀔 환경 변수를 정리했어요.', detail: 'DB 주소·계정 · S3 버킷·엔드포인트 · 비밀 값' },
  { after: 10200, id: 'infra-network', stream: 'infrastructure', progress: 88, key: 'network', message: '내부·외부 통신 경로를 확인했어요.', detail: 'NAT Gateway · S3 Gateway Endpoint · 앱 SG는 ALB:8080만 허용' },
  { after: 10900, id: 'code-auth', stream: 'code', progress: 92, key: 'auth', message: '대상 환경의 인증 변경점을 찾았어요.', detail: 'EC2 IAM Role 방식 → 대상 스토리지 인증 방식' },
  { after: 11700, id: 'infra-iam', stream: 'infrastructure', progress: 100, key: 'iam', message: '인프라 분석을 마쳤어요.', detail: 'EC2 Instance Role의 S3 최소 권한 · DB 외부 공개 없음' },
  { after: 12400, id: 'code-done', stream: 'code', progress: 100, key: 'code-done', message: '소스코드 분석을 마쳤어요.', detail: '인프라·코드 의존성을 연결해 이전 계획을 준비합니다.' },
]

const INFRA_NODES = [
  { key: 'vpc', name: 'VPC · 서브넷', detail: '네트워크' },
  { key: 'alb', name: 'ALB', detail: '외부 진입' },
  { key: 'ec2', name: 'EC2 t3.small', detail: '앱 서버' },
  { key: 'postgres', name: 'PostgreSQL 16', detail: 'Docker DB' },
  { key: 's3', name: 'Private S3', detail: '스토리지' },
  { key: 'network', name: 'NAT · Endpoint', detail: '라우팅' },
  { key: 'iam', name: 'IAM · 보안', detail: '접근 정책' },
]

const CODE_NODES = [
  { key: 'compose', name: 'Docker Compose', detail: '배포 구성' },
  { key: 'app', name: '앱 API · /health', detail: '애플리케이션' },
  { key: 'database', name: 'DB 연결', detail: 'PostgreSQL' },
  { key: 'sdk', name: 'S3 연결', detail: '오브젝트 저장소' },
  { key: 'env', name: '환경 변수', detail: '설정 매핑' },
  { key: 'auth', name: '인증 방식', detail: 'IAM 의존성' },
]

type TransitionParticle = {
  x: number
  y: number
  startX: number
  startY: number
  delay: number
  group: number
  bright: boolean
}

function ParticleReveal({ stage, onComplete }: { stage: RefObject<HTMLElement | null>; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const completeRef = useRef(onComplete)
  useEffect(() => { completeRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = stage.current
    if (!canvas || !host) return
    const context = canvas.getContext('2d')
    if (!context) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      completeRef.current()
      return
    }
    let frame = 0
    let finished = false

    const prepare = () => {
      if (finished) return
      cancelAnimationFrame(frame)
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const elements = Array.from(host.querySelectorAll<HTMLElement>('[data-particle-target]'))
      const particles: TransitionParticle[] = []
      const addParticle = (x: number, y: number, group: number) => {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.min(width, height) * (.04 + Math.random() * .25)
        particles.push({
          x, y,
          startX: width / 2 + Math.cos(angle) * radius,
          startY: height / 2 + Math.sin(angle) * radius,
          delay: Math.random() * 280 + Math.min(group, 12) * 70,
          group,
          bright: Math.random() < .22,
        })
      }

      elements.forEach((element, group) => {
        const rect = element.getBoundingClientRect()
        const kind = element.dataset.particleTarget
        if (rect.width < 2 || rect.height < 2) return
        if (kind === 'text') {
          const mask = document.createElement('canvas')
          mask.width = Math.ceil(rect.width)
          mask.height = Math.ceil(rect.height)
          const maskContext = mask.getContext('2d')
          if (!maskContext) return
          const computed = window.getComputedStyle(element)
          maskContext.font = computed.font
          maskContext.textBaseline = 'middle'
          maskContext.fillText(element.textContent || '', 0, rect.height / 2)
          const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data
          for (let y = 0; y < mask.height; y += 2) {
            for (let x = 0; x < mask.width; x += 2) {
              if (pixels[(y * mask.width + x) * 4 + 3] > 120) addParticle(rect.left + x, rect.top + y, group)
            }
          }
        } else if (kind === 'line') {
          for (let x = 0; x < rect.width; x += 2) {
            addParticle(rect.left + x, rect.top + rect.height / 2 + (Math.random() - .5) * 5, group)
          }
        } else if (kind === 'circle') {
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          for (let angle = 0; angle < Math.PI * 2; angle += .045) {
            addParticle(centerX + Math.cos(angle) * rect.width * .48, centerY + Math.sin(angle) * rect.height * .48, group)
          }
          for (let i = 0; i < 130; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = Math.sqrt(Math.random()) * .45
            addParticle(centerX + Math.cos(angle) * rect.width * radius, centerY + Math.sin(angle) * rect.height * radius, group)
          }
        } else {
          for (let x = 0; x < rect.width; x += 3) {
            addParticle(rect.left + x, rect.top, group)
            addParticle(rect.left + x, rect.bottom, group)
          }
          for (let y = 0; y < rect.height; y += 3) {
            addParticle(rect.left, rect.top + y, group)
            addParticle(rect.right, rect.top + y, group)
          }
          const interior = Math.min(1500, Math.round(rect.width * rect.height / 110))
          for (let i = 0; i < interior; i++) {
            addParticle(rect.left + Math.random() * rect.width, rect.top + Math.random() * rect.height, group)
          }
        }
      })
      const sampled = particles.length
      for (let i = sampled; i < 18000 && sampled > 0; i++) {
        const target = particles[Math.floor(Math.random() * sampled)]
        addParticle(target.x + (Math.random() - .5) * 5, target.y + (Math.random() - .5) * 5, target.group)
      }

      const began = performance.now()
      const draw = (now: number) => {
        const elapsed = now - began
        context.clearRect(0, 0, width, height)
        elements.forEach((element, group) => {
          const reveal = Math.max(0, Math.min(1, (elapsed - 1580 - Math.min(group, 12) * 70) / 700))
          element.style.opacity = String(reveal)
        })
        for (const particle of particles) {
          const progress = Math.max(0, Math.min(1, (elapsed - particle.delay) / 2050))
          const eased = progress * progress * (3 - 2 * progress)
          const reveal = Math.max(0, Math.min(1, (elapsed - 1580 - Math.min(particle.group, 12) * 70) / 700))
          const sway = (1 - eased) * 12
          const x = particle.startX + (particle.x - particle.startX) * eased + Math.sin(elapsed * .004 + particle.delay) * sway
          const y = particle.startY + (particle.y - particle.startY) * eased + Math.cos(elapsed * .003 + particle.delay) * sway
          context.globalAlpha = (.4 + eased * .55) * (1 - reveal)
          context.fillStyle = particle.bright ? '#aaa' : '#2b2b2b'
          context.fillRect(x, y, particle.bright ? 2 : 1.5, particle.bright ? 2 : 1.5)
        }
        context.globalAlpha = 1
        if (elapsed < 3200) {
          frame = requestAnimationFrame(draw)
        } else {
          finished = true
          elements.forEach(element => { element.style.opacity = '' })
          completeRef.current()
        }
      }
      frame = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', prepare)
    prepare()
    return () => {
      window.removeEventListener('resize', prepare)
      cancelAnimationFrame(frame)
    }
  }, [stage])

  return <canvas ref={canvasRef} className="analysis-particle-reveal" aria-hidden="true" />
}

function progressFor(updates: AnalysisUpdate[], stream: AnalysisUpdate['stream']) {
  let progress = 0
  for (const update of updates) {
    if (update.stream === stream) progress = update.progress
  }
  return progress
}

function AnalysisCluster({ title, subtitle, root, stream, progress, nodes, discovered, findings }: {
  title: string
  subtitle: string
  root: string
  stream: AnalysisUpdate['stream']
  progress: number
  nodes: typeof INFRA_NODES
  discovered: Set<string>
  findings: Map<string, string>
}) {
  const foundCount = nodes.filter(node => discovered.has(node.key)).length
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [foundCount])
  return <section className={'analysis-cluster analysis-' + stream}>
    <div className="analysis-cluster-heading">
      <span className="analysis-cluster-icon" data-particle-target="circle" aria-hidden="true">{stream === 'infrastructure' ? '◫' : '⌘'}</span>
      <div>
        <h2 data-particle-target="text">{title}</h2>
        <p data-particle-target="text">{subtitle}</p>
      </div>
      <strong data-particle-target="text">{progress}%</strong>
    </div>
    <div className="analysis-progress" data-particle-target="line" role="progressbar" aria-label={title + ' 진행률'} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: progress + '%' }} />
    </div>
    <div className="analysis-stream">
      <div className="analysis-root">
        <span className="analysis-root-orb" data-particle-target="circle" aria-hidden="true" />
        <div><strong data-particle-target="text">{root}</strong><small data-particle-target="text">{progress === 100 ? '탐색 완료' : '탐색 중...'}</small></div>
      </div>
      <div ref={listRef} className={'analysis-result-list' + (foundCount > 0 ? ' has-results' : '')}>
        {nodes.map((node, index) => <div key={node.key}
          className={'analysis-result' + (discovered.has(node.key) ? ' is-discovered' : '')}
          aria-hidden={!discovered.has(node.key)}>
          <span className="analysis-result-point" aria-hidden="true" />
          <div className="analysis-result-content">
            <small>{String(index + 1).padStart(2, '0')} / {node.detail}</small>
            <strong>{node.name}</strong>
            <p>{findings.get(node.key)}</p>
          </div>
        </div>)}
      </div>
      {progress < 100
        ? <div className="analysis-scanning" aria-hidden="true"><span />다음 구성 요소 탐색 중</div>
        : <div className="analysis-complete" aria-hidden="true"><span>✓</span>분석 완료</div>}
    </div>
  </section>
}

type Handoff = {
  sources: Array<{ x: number; y: number; dx: number; dy: number }>
}

export default function AnalysisStage({ updates, onAdvance }: {
  updates?: AnalysisUpdate[]
  onAdvance: (results: AnalysisUpdate[]) => void
}) {
  const stageRef = useRef<HTMLElement>(null)
  const advanceRef = useRef(onAdvance)
  const advancedRef = useRef(false)
  const [demoUpdates, setDemoUpdates] = useState<AnalysisUpdate[]>([])
  const [ready, setReady] = useState(false)
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { advanceRef.current = onAdvance }, [onAdvance])

  useEffect(() => {
    if (updates) return
    const timers = DEMO_UPDATES.map(({ after, ...update }) =>
      window.setTimeout(() => setDemoUpdates(current => [...current, update]), after))
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [updates])

  const activeUpdates = updates ?? demoUpdates
  const infrastructure = progressFor(activeUpdates, 'infrastructure')
  const code = progressFor(activeUpdates, 'code')
  const discovered = new Set(activeUpdates.map(update => update.key))
  const findings = new Map(activeUpdates.map(update => [update.key, update.detail]))
  const finished = infrastructure === 100 && code === 100

  useEffect(() => {
    if (!finished || !ready || advancedRef.current) return
    const timer = window.setTimeout(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        advancedRef.current = true
        advanceRef.current(activeUpdates)
        return
      }
      const host = stageRef.current
      if (host) {
        const bounds = host.getBoundingClientRect()
        const isCompact = bounds.width <= 900
        const isMobile = bounds.width <= 650
        const padX = Math.min(78, Math.max(28, bounds.width * .04))
        const padY = Math.min(52, Math.max(24, bounds.height * .04))
        const orbRadius = isCompact ? 25 : 29
        const visualHeight = isMobile ? 180 : bounds.height - padY * 2
        const visualWidth = (bounds.width - padX * 2) * (isMobile ? 1 : isCompact ? .29 : .31)
        const targets = [
          { x: padX + visualWidth * .14 + orbRadius, y: padY + visualHeight * (isMobile ? .18 : .28) + orbRadius },
          { x: padX + visualWidth * .14 + orbRadius, y: padY + visualHeight * (isMobile ? .6 : .63) + orbRadius },
        ]
        const sources = Array.from(host.querySelectorAll<HTMLElement>('.analysis-root-orb')).map((node, index) => {
          const rect = node.getBoundingClientRect()
          const x = rect.left + rect.width / 2 - bounds.left
          const y = rect.top + rect.height / 2 - bounds.top
          const target = targets[index]
          return { x, y, dx: target.x - x, dy: target.y - y }
        })
        setHandoff({ sources })
      }
      setLeaving(true)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [finished, ready, activeUpdates])

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => {
      if (advancedRef.current) return
      advancedRef.current = true
      advanceRef.current(activeUpdates)
    }, 2050)
    return () => window.clearTimeout(timer)
  }, [leaving, activeUpdates])

  return <section ref={stageRef} className={'analysis-stage' + (ready ? ' is-ready' : '') + (leaving ? ' is-handoff' : '')}
    aria-label="인프라 및 소스코드 분석">
    <div className="analysis-flow">
      <AnalysisCluster title="인프라 분석" subtitle="AWS 리소스를 탐색하고 구성을 살펴보고 있어요."
        root="AWS 계정" stream="infrastructure" progress={infrastructure} nodes={INFRA_NODES} discovered={discovered} findings={findings} />
      <AnalysisCluster title="소스코드 분석" subtitle="코드 구조와 외부 의존성을 살펴보고 있어요."
        root="프로젝트 파일" stream="code" progress={code} nodes={CODE_NODES} discovered={discovered} findings={findings} />
      <aside className="analysis-discovery">
        <div className="analysis-discovery-title">
          <span className="analysis-live-dot" data-particle-target="circle" />
          <strong data-particle-target="text">실시간 발견</strong>
          {!updates && <small data-particle-target="text">DEMO</small>}
        </div>
        <div className="analysis-discovery-items" aria-live="polite">
          {activeUpdates.length === 0
            ? <p data-particle-target="text">인프라와 소스코드를 동시에 분석하고 있어요.</p>
            : [...activeUpdates].reverse().map(update => <div className="analysis-discovery-item" key={update.id}>
                <small>{update.stream === 'infrastructure' ? '인프라' : '소스코드'}</small>
                <strong>{update.message}</strong>
                <em>{update.detail}</em>
              </div>)}
        </div>
      </aside>
    </div>
    <div className="analysis-next-area">
      <span data-particle-target="text">{finished ? '분석 완료 · 이전 계획을 준비하고 있어요.' : '인프라와 소스코드를 동시에 분석하고 있어요.'}</span>
    </div>
    {leaving && handoff && <div className="analysis-handoff" aria-hidden="true">
      {handoff.sources.map((source, index) => <span key={index} className="analysis-handoff-source" style={{
        left: source.x, top: source.y, '--dx': source.dx + 'px', '--dy': source.dy + 'px',
      } as CSSProperties}><span>{index === 0 ? '◫' : '⌘'}</span></span>)}
    </div>}
    {!ready && <ParticleReveal stage={stageRef} onComplete={() => setReady(true)} />}
  </section>
}
