import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FlaskConical, BarChart3, Zap, TrendingUp } from 'lucide-react'
import { FloatingNeuralNetwork } from '../components/FloatingNeuralNetwork'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-page">
      {/* Top navigation */}
      <nav className="sticky top-0 z-50 overflow-hidden border-b border-white/10 bg-neutral-950/95 text-white backdrop-blur-md">
        <FloatingNeuralNetwork density="landing" className="opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/experiment-logo.svg" alt="Experiment" className="w-10 h-10 rounded-xl shadow-[0_8px_24px_rgba(166,42,86,.28)]" />
            <span className="font-bold text-lg text-white">Experiment</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className="text-neutral-200 hover:bg-white/10 hover:text-white" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" className="bg-[#A62A56] text-white hover:bg-[#8F2448] shadow-[0_8px_24px_rgba(166,42,86,.24)]" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[680px] overflow-hidden border-b border-neutral-100 bg-neutral-950 px-4 py-24 text-white">
        <FloatingNeuralNetwork density="landing" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,.08),transparent_42%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-neutral-300 backdrop-blur-sm">Local-first experiment tracking</div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Every experiment tells a story.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-neutral-300 md:text-xl">
            Track training runs, compare model performance, and understand what makes your machine learning models better.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-white text-neutral-950 hover:bg-neutral-200" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
            <Button size="lg" variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Features
            </Button>
          </div>
        </div>
        <div className="relative z-10 mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-900/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-neutral-500" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="ml-3 text-xs text-neutral-500">Experiment dashboard</span></div>
          <div className="grid min-h-64 grid-cols-4 gap-3 p-4 text-left text-neutral-200 md:p-6">
            <div className="hidden rounded-lg border border-white/10 bg-black/20 p-4 md:block"><div className="mb-5 text-xs font-semibold">EXPERIMENT</div>{['Overview','Runs','Models','Notes'].map((item,i)=><div key={item} className={`mb-2 rounded px-2 py-1.5 text-xs ${i===0?'bg-white text-neutral-950':'text-neutral-500'}`}>{item}</div>)}</div>
            <div className="col-span-4 space-y-3 md:col-span-3"><div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-white/10 p-3"><div className="text-xs text-neutral-500">Runs</div><div className="mt-1 text-xl font-semibold">24</div></div><div className="rounded-lg border border-white/10 p-3"><div className="text-xs text-neutral-500">Accuracy</div><div className="mt-1 text-xl font-semibold">94.8%</div></div><div className="rounded-lg border border-white/10 p-3"><div className="text-xs text-neutral-500">Best run</div><div className="mt-1 text-xl font-semibold">#18</div></div></div><div className="h-36 rounded-lg border border-white/10 bg-[linear-gradient(transparent_24%,rgba(255,255,255,.05)_25%)] bg-[length:100%_25%] p-4"><svg viewBox="0 0 600 140" className="h-full w-full" aria-label="Sample accuracy chart"><polyline points="0,120 80,105 160,110 240,74 320,82 400,44 480,52 600,20" fill="none" stroke="white" strokeWidth="3"/><circle cx="600" cy="20" r="4" fill="white"/></svg></div></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative overflow-hidden py-16 px-4 bg-white">
        <FloatingNeuralNetwork density="landing" className="opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-950">
            Built for ML Practitioners
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="!bg-white !text-neutral-950 !border-neutral-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-lg flex items-center justify-center">
                <FlaskConical size={24} className="text-neutral-950" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-950">Track Experiments</h3>
              <p className="!text-neutral-600 leading-relaxed">
                Record experiments with metrics, hyperparameters, and notes. Organize by model, dataset, and tags.
              </p>
            </Card>

            <Card className="!bg-white !text-neutral-950 !border-neutral-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-lg flex items-center justify-center">
                <BarChart3 size={24} className="text-neutral-950" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-950">Compare Models</h3>
              <p className="!text-neutral-600 leading-relaxed">
                Side-by-side comparison of runs and experiments. Highlight best values automatically.
              </p>
            </Card>

            <Card className="!bg-white !text-neutral-950 !border-neutral-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-neutral-950" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-950">Analyze Performance</h3>
              <p className="!text-neutral-600 leading-relaxed">
                Beautiful charts showing accuracy over time, performance by model, and training insights.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-950">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                <Zap size={16} className="text-neutral-950" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-950 mb-2">Multiple Runs Per Experiment</h3>
                <p className="text-neutral-600">
                  Track MNIST CNN with 4 different runs and see improvement over time.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                <Zap size={16} className="text-neutral-950" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-950 mb-2">Organize Everything</h3>
                <p className="text-neutral-600">
                  Manage datasets, models, and notes. Tag and search across all your work.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                <Zap size={16} className="text-neutral-950" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-950 mb-2">Beautiful Analytics</h3>
                <p className="text-neutral-600">
                  Visualize trends with clean, readable charts. Understand your results at a glance.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                <Zap size={16} className="text-neutral-950" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-950 mb-2">Your Data, Your Rules</h3>
                <p className="text-neutral-600">
                  Secure authentication and private experiments. Only you can access your results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-neutral-950">
            Ready to track your experiments?
          </h2>
          <p className="text-lg text-neutral-600">
            Sign up for free. No credit card required. Start tracking today.
          </p>
          <Button size="lg" onClick={() => navigate('/signup')}>
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 bg-page py-8 px-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/experiment-logo.svg" alt="Experiment" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-neutral-950">Experiment</span>
          </div>
          <div className="flex gap-6 text-sm text-neutral-600">
            <button onClick={() => navigate('/login')} className="hover:text-neutral-950">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="hover:text-neutral-950">
              Sign Up
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
