import { useEffect, useRef, useState, type RefObject } from 'react'
import type { AnalysisUpdate } from './AnalysisStage'

type PlanStep = { id: string; group: 'infrastructure' | 'code'; before: string; after: string; evidence: string; change: string }

const PLAN_STEPS: PlanStep[] = [
  { id: 'network', group: 'infrastructure', before: 'ALB · VPC', after: 'K3s Ingress · 대상 네트워크', evidence: '서울 리전 VPC 10.0.0.0/16, ALB HTTPS 443 → 앱 HTTP 8080', change: '외부 HTTPS 진입은 Ingress로 연결하고 앱과 DB는 내부망에 둡니다.' },
  { id: 'compute', group: 'infrastructure', before: 'EC2 t3.small · Docker Compose', after: 'K3s Deployment · Service', evidence: '프라이빗 Ubuntu EC2에서 앱 컨테이너가 8080 포트로 실행', change: '앱 이미지를 배포하고 8080 포트와 /health 확인 경로를 유지합니다.' },
  { id: 'database', group: 'infrastructure', before: 'Docker PostgreSQL 16 · Named Volume', after: 'PostgreSQL 16 · 영구 볼륨', evidence: '같은 EC2의 Docker Network 내부 TCP 5432, 외부 DB 포트 미공개', change: '버전과 데이터 경로를 유지하고 논리 복제 설정을 검증합니다.' },
  { id: 'storage', group: 'infrastructure', before: 'Private S3 버킷', after: 'S3 호환 오브젝트 스토리지', evidence: 'uploads-demo 버킷 · EC2 Instance Role 최소 접근 권한', change: '객체와 접근 권한을 옮기고 대상 버킷 이름으로 매핑합니다.' },
  { id: 'db-code', group: 'code', before: 'DB_HOST=postgres · DB_PORT=5432', after: '대상 PostgreSQL Service', evidence: '앱이 Docker 내부 호스트 이름으로 PostgreSQL에 접속', change: 'DB_HOST를 대상 Service 주소로 바꾸고 새 DB 계정 정보를 주입합니다.' },
  { id: 's3-code', group: 'code', before: 'S3_BUCKET · S3_REGION · AWS IAM', after: 'S3_ENDPOINT · 대상 인증 설정', evidence: 'S3_BUCKET=uploads-demo, S3_REGION=ap-northeast-2', change: 'SDK의 객체 API는 유지하면서 엔드포인트와 버킷을 매핑합니다. 다른 비밀 값은 사용자 입력을 받습니다.' },
]

const FIRST_REVEAL = 2550
const REVEAL_GAP = 720
const FLOW_END = FIRST_REVEAL + PLAN_STEPS.length * REVEAL_GAP + 850

type Particle = { sx: number; sy: number; ex: number; ey: number; c1x: number; c1y: number; c2x: number; c2y: number; phase: number; delay: number; duration: number; size: number; shade: string }

function PlanParticleFlow({ stage }: { stage: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const host = stage.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let started = performance.now()
    let particles: Particle[] = []
    let width = 0
    let height = 0
    const centerOf = (selector: string) => {
      const rect = host.querySelector(selector)?.getBoundingClientRect()
      const parent = host.getBoundingClientRect()
      return rect ? { x: rect.left + rect.width / 2 - parent.left, y: rect.top + rect.height / 2 - parent.top, rect } : null
    }
    const prepare = () => {
      cancelAnimationFrame(frame)
      const ratio = Math.min(devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const sources = [centerOf('.plan-source-infra .plan-source-orb'), centerOf('.plan-source-code .plan-source-orb')]
      const core = centerOf('.plan-core')
      const documentArea = centerOf('.plan-document')
      particles = []
      if (!core || !documentArea || sources.some(source => !source)) return
      for (const source of sources) {
        if (!source) continue
        for (let i = 0; i < 2500; i++) {
          const a = Math.random() * Math.PI * 2
          const r = Math.sqrt(Math.random()) * 17
          const endA = Math.random() * Math.PI * 2
          const endR = Math.sqrt(Math.random()) * Math.min(core.rect.width, 120) * .27
          const sx = source.x + Math.cos(a) * r
          const sy = source.y + Math.sin(a) * r
          const ex = core.x + Math.cos(endA) * endR
          const ey = core.y + Math.sin(endA) * endR
          const distance = ex - sx
          particles.push({ sx, sy, ex, ey, c1x: sx + distance * .39, c1y: sy + (Math.random() - .5) * 25, c2x: ex - distance * .32, c2y: ey + (Math.random() - .5) * 25, phase: Math.random() * Math.PI * 2, delay: 100 + Math.random() * (FLOW_END - 1700), duration: 950 + Math.random() * 550, size: Math.random() * .9 + .65, shade: Math.random() < .2 ? '#b0b0b0' : '#666' })
        }
      }
      // The outgoing stream ends in the gutter before the document; rows reveal independently.
      for (let i = 0; i < 3000; i++) {
        const angle = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * core.rect.width * .28
        const sx = core.x + Math.cos(angle) * r
        const sy = core.y + Math.sin(angle) * r
        const leftEdge = documentArea.rect.left - host.getBoundingClientRect().left
        const ex = leftEdge - 42 - Math.random() * 42
        const ey = core.y + (Math.random() - .5) * 125
        const distance = ex - sx
        particles.push({ sx, sy, ex, ey, c1x: sx + distance * .35, c1y: sy + (Math.random() - .5) * 24, c2x: ex - distance * .27, c2y: ey + (Math.random() - .5) * 24, phase: Math.random() * Math.PI * 2, delay: 1650 + Math.random() * (FLOW_END - 2800), duration: 690 + Math.random() * 500, size: Math.random() * .9 + .65, shade: Math.random() < .2 ? '#b0b0b0' : '#666' })
      }
      started = performance.now()
      frame = requestAnimationFrame(draw)
    }
    const draw = (now: number) => {
      const elapsed = now - started
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        const progress = (elapsed - p.delay) / p.duration
        if (progress <= 0 || progress >= 1) continue
        const t = progress * progress * (3 - 2 * progress)
        const inverse = 1 - t
        const x = inverse ** 3 * p.sx + 3 * inverse ** 2 * t * p.c1x + 3 * inverse * t ** 2 * p.c2x + t ** 3 * p.ex
        const y = inverse ** 3 * p.sy + 3 * inverse ** 2 * t * p.c1y + 3 * inverse * t ** 2 * p.c2y + t ** 3 * p.ey
          + Math.sin(progress * Math.PI) * Math.sin(p.phase + progress * 9) * 5
        ctx.globalAlpha = Math.min(1, progress * 5, (1 - progress) * 5) * .47
        ctx.fillStyle = p.shade
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (elapsed < FLOW_END) frame = requestAnimationFrame(draw)
    }
    const resize = () => prepare()
    window.addEventListener('resize', resize)
    prepare()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [stage])
  return <canvas ref={canvasRef} className="plan-particle-flow" aria-hidden="true" />
}

export default function AIPlanningStage({ analysis }: { analysis: AnalysisUpdate[] }) {
  const stageRef = useRef<HTMLElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)
  const [coreReady, setCoreReady] = useState(false)
  const hasInfra = analysis.some(update => update.stream === 'infrastructure')
  const hasCode = analysis.some(update => update.stream === 'code')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCoreReady(true)
      setVisibleCount(PLAN_STEPS.length)
      return
    }
    const timers = [window.setTimeout(() => setCoreReady(true), 1400), ...PLAN_STEPS.map((_, index) =>
      window.setTimeout(() => setVisibleCount(index + 1), FIRST_REVEAL + index * REVEAL_GAP))]
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [])

  return <section ref={stageRef} className="plan-stage" aria-label="AI 이전 계획">
    <div className="plan-visual" aria-hidden="true">
      <div className="plan-source plan-source-infra">
        <span className="plan-source-orb"><span>◫</span></span>
        <strong>인프라 분석</strong>
        <small>{hasInfra ? 'AWS 구성 확인 완료' : '분석 결과 연결 중'}</small>
      </div>
      <div className="plan-source plan-source-code">
        <span className="plan-source-orb"><span>⌘</span></span>
        <strong>소스코드 분석</strong>
        <small>{hasCode ? '의존성 확인 완료' : '분석 결과 연결 중'}</small>
      </div>
      <div className={'plan-core' + (coreReady ? ' is-ready' : '')}>
        <span className="plan-core-ring plan-core-ring-one" />
        <span className="plan-core-ring plan-core-ring-two" />
        <span className="plan-core-light" />
      </div>
      <p className="plan-core-caption">분석 결과를 연결해 계획으로 변환 중</p>
    </div>

    <div className="plan-document">
      <header className="plan-heading">
        <small>AI PLANNER + CODE ADAPTER <span>DEMO</span></small>
        <h1>이전 계획을 설계하고 있어요</h1>
        <p>AWS 구성과 애플리케이션 의존성을 함께 살펴보고, 변경할 항목과 근거를 연결합니다.</p>
        <div className="plan-target"><span>출발</span><strong>AWS · 서울 리전</strong><i>→</i><span>대상</span><strong>온프레미스 K3s</strong><small>데모 예시</small></div>
      </header>
      <div className="plan-changes">
        {(['infrastructure', 'code'] as const).map(group => <section className="plan-change-group" key={group}>
          <h2>{group === 'infrastructure' ? '인프라 변경 제안' : '코드 · 설정 변경 제안'}</h2>
          {PLAN_STEPS.map((step, index) => step.group !== group ? null : <article key={step.id} data-step={index}
            className={'plan-change' + (visibleCount > index ? ' is-visible' : '')}>
            <span className="plan-change-index">{String(index + 1).padStart(2, '0')}</span>
            <div className="plan-change-body">
              <strong><span>{step.before}</span><b aria-hidden="true">→</b><span>{step.after}</span></strong>
              <p className="plan-evidence">확인된 구성 · {step.evidence}</p>
              <p>{step.change}</p>
            </div>
          </article>)}
        </section>)}
      </div>
      <div className="plan-status" aria-live="polite">
        <span className={visibleCount === PLAN_STEPS.length ? 'is-complete' : ''} />
        {visibleCount === PLAN_STEPS.length ? '이전 계획 초안이 준비됐어요.' : '변경 근거를 계획에 반영하고 있어요.'}
        <small>{visibleCount} / {PLAN_STEPS.length}</small>
      </div>
    </div>
    <PlanParticleFlow stage={stageRef} />
  </section>
}
