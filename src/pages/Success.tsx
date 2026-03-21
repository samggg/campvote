import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

export default function Success() {
  const navigate = useNavigate()
  const location = useLocation()
  const categoryName = (location.state as any)?.categoryName ?? 'categoria'
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Confete simples em canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 7 + 3,
      color: ['#f97316','#22c55e','#f4f4f5','#fb923c','#86efac'][Math.floor(Math.random()*5)],
      vx: (Math.random() - .5) * 2,
      vy: Math.random() * 3 + 1.5,
      tilt: Math.random() * Math.PI * 2,
    }))

    let running = true
    const loop = () => {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        p.x += p.vx; p.y += p.vy; p.tilt += .05
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
      })
      requestAnimationFrame(loop)
    }
    loop()

    const t = setTimeout(() => { running = false }, 4000)
    return () => { running = false; clearTimeout(t) }
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', textAlign: 'center', position: 'relative'
    }}>

      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 360 }}>

        {/* Check icon */}
        <div className="pop-in" style={{
          width: 88, height: 88, borderRadius: 28, margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(34,197,94,.15)', border: '2px solid var(--green)',
          animation: 'pulse-fire 2s ease-in-out infinite'
        }}>
          <CheckCircle2 size={44} color="var(--green)" />
        </div>

        <h1 className="fade-up" style={{ marginBottom: 12 }}>
          Voto<br /><span style={{ color: 'var(--green)' }}>registrado!</span>
        </h1>

        <p className="fade-up" style={{ color: 'var(--muted)', marginBottom: 8, animationDelay: '.1s' }}>
          Sua escolha em
        </p>
        <p className="fade-up" style={{
          fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)',
          marginBottom: 32, animationDelay: '.15s'
        }}>
          "{categoryName}"
        </p>
        <p className="fade-up" style={{
          color: 'var(--muted)', fontSize: '.85rem', marginBottom: 40, animationDelay: '.2s'
        }}>
          foi salvo com segurança neste dispositivo.
        </p>

        <button
          className="btn btn-fire fade-up"
          style={{ animationDelay: '.25s' }}
          onClick={() => navigate('/categorias')}
        >
          Ver outras categorias →
        </button>
      </div>
    </div>
  )
}