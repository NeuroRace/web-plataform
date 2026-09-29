import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { NeuralField } from "@/components/signal/NeuralField";
import mascotWinner from "@/public/assets/images/mascot-winner.png";
import concentracao from "@/public/assets/images/concentracao.png";

export default function Home() {
  return (
    <div className="flex flex-col overflow-hidden">
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-16">
        <NeuralField className="absolute inset-0 z-0 h-full w-full opacity-60" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <a 
                href="https://www.youtube.com/watch?v=THOsytxXRF4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-sm font-mono uppercase tracking-widest mb-6 transition-all hover:bg-gold/20 hover:scale-105"
              >
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.6)]"></span>
                Nos encontre no Next 2026
              </a>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] text-fg-strong">
                Onde a sua<br /><span className="text-attention">mente</span> é o<br />controle.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 text-lg sm:text-xl text-fg leading-relaxed max-w-xl">
                Você já imaginou controlar um jogo apenas com o poder do seu foco? O NeuroRace transforma isso em realidade através de neurofeedback em tempo real.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-4">
                <ButtonLink href="/dashboard" className="px-8 py-4 text-lg">Ver meu diagnóstico</ButtonLink>
                <ButtonLink href="/ranking" variant="secondary" className="px-8 py-4 text-lg">Ranking ao Vivo</ButtonLink>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.3} className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-attention/20 blur-[100px] rounded-full"></div>
              <Image 
                src={mascotWinner} 
                alt="Mascote NeuroRace" 
                className="relative z-10 w-full h-auto drop-shadow-2xl hover:-translate-y-4 transition-transform duration-700"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* --- COMO FUNCIONA (FLUXO) --- */}
      <section className="py-24 bg-bg-elev/50 border-y border-hairline">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-fg-strong">A Experiência NeuroRace</h2>
              <p className="mt-4 text-lg text-fg">O fluxo completo: do estande até a inteligência artificial mapeando seu cérebro.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 relative mt-16">
            
            {/* --- Linha Conectora (Onda animada) - Desktop --- */}
            <div className="hidden md:block absolute top-14 left-[16%] right-[16%] z-0 pointer-events-none">
              <svg width="100%" height="24" preserveAspectRatio="none" viewBox="0 0 100 24" className="overflow-visible">
                <style>
                  {`
                    @keyframes flowDash {
                      from { stroke-dashoffset: 16; }
                      to { stroke-dashoffset: 0; }
                    }
                    .animate-flow {
                      animation: flowDash 1.5s linear infinite;
                    }
                  `}
                </style>
                {/* Onda com dash animado */}
                <path d="M 0,12 Q 25,30 50,12 T 100,12" fill="none" stroke="url(#flow-gradient)" strokeWidth="3" strokeDasharray="8 8" className="animate-flow opacity-60" />
                {/* Setas direcionais ao longo da onda */}
                <path d="M 45,8 L 50,12 L 45,16" fill="none" stroke="#ff4d88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 95,8 L 100,12 L 95,16" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                
                <defs>
                  <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-attention)" />
                    <stop offset="50%" stopColor="#ff4d88" />
                    <stop offset="100%" stopColor="var(--color-gold)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Passo 1: Conexão */}
            <Reveal delay={0.1} className="relative z-10">
              <div className="glass-card p-8 h-full flex flex-col items-center text-center group hover:border-attention/50 transition-all hover:-translate-y-2 duration-500 bg-bg/80 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full border-2 border-attention bg-bg text-attention flex items-center justify-center text-xl font-extrabold mb-6 shadow-[0_0_20px_rgba(91,227,200,0.3)]">1</div>
                <h3 className="font-display text-xl font-bold text-fg-strong mb-3">Conexão BCI</h3>
                <p className="text-fg leading-relaxed">No estande, você veste o sensor NeuroSky. Seus biossinais (Atenção, Meditação e ondas Alpha/Beta/Theta) são capturados instantaneamente.</p>
              </div>
            </Reveal>

            {/* Passo 2: Jogo */}
            <Reveal delay={0.2} className="relative z-10">
              <div className="glass-card p-8 h-full flex flex-col items-center text-center group hover:border-[#ff4d88]/50 transition-all hover:-translate-y-2 duration-500 bg-bg/80 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full border-2 border-[#ff4d88] bg-bg text-[#ff4d88] flex items-center justify-center text-xl font-extrabold mb-6 shadow-[0_0_20px_rgba(255,77,136,0.3)]">2</div>
                <h3 className="font-display text-xl font-bold text-fg-strong mb-3">A Corrida (Unreal)</h3>
                <p className="text-fg leading-relaxed">Esqueça o controle. Na pista 1v1, a velocidade do seu personagem é modulada estritamente pela estabilidade do seu foco mental sob pressão.</p>
              </div>
            </Reveal>

            {/* Passo 3: Nuvem/IA */}
            <Reveal delay={0.3} className="relative z-10">
              <div className="glass-card p-8 h-full flex flex-col items-center text-center group hover:border-gold/50 transition-all hover:-translate-y-2 duration-500 bg-bg/80 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full border-2 border-gold bg-bg text-gold flex items-center justify-center text-xl font-extrabold mb-6 shadow-[0_0_20px_rgba(255,215,0,0.3)]">3</div>
                <h3 className="font-display text-xl font-bold text-fg-strong mb-3">Análise Cognitiva</h3>
                <p className="text-fg leading-relaxed">Os dados sobem para nossa nuvem. No seu Dashboard, uma IA gera diagnósticos do seu perfil neural e aponta como melhorar seu foco.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --- TECNOLOGIA (CARDS INTERATIVOS) --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Reveal>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-fg-strong mb-6">Motor de IA Cognitiva</h2>
                <p className="text-lg text-fg mb-8 leading-relaxed">
                  Não é apenas um jogo. Nossa plataforma conta com uma Inteligência Artificial avançada que analisa seus dados cerebrais e traduz em um diagnóstico real e acionável em questão de milissegundos.
                </p>
              </Reveal>

              <div className="space-y-4">
                <Reveal delay={0.1}>
                  <div className="glass-card p-6 hover:border-attention/30 transition-colors cursor-default">
                    <h4 className="font-display text-lg font-bold text-attention mb-2">Reação sob Pressão</h4>
                    <p className="text-base text-fg leading-relaxed">Detectamos quedas bruscas de foco no exato momento em que você sofre uma ultrapassagem ou pressão do adversário.</p>
                  </div>
                </Reveal>
                <Reveal delay={0.2}>
                  <div className="glass-card p-6 hover:border-attention/30 transition-colors cursor-default">
                    <h4 className="font-display text-lg font-bold text-attention mb-2">Seu Perfil Mental</h4>
                    <p className="text-base text-fg leading-relaxed">Nossa IA analisa seu padrão de concentração para descobrir se você é um "Mestre Zen", "Sprinter Explosivo" ou "Hiperfocado".</p>
                  </div>
                </Reveal>
                <Reveal delay={0.3}>
                  <div className="glass-card p-6 hover:border-attention/30 transition-colors cursor-default">
                    <h4 className="font-display text-lg font-bold text-attention mb-2">Privacidade Garantida</h4>
                    <p className="text-base text-fg leading-relaxed">Sua atividade cerebral é processada em um ambiente em nuvem seguro, garantindo total privacidade das suas informações.</p>
                  </div>
                </Reveal>
              </div>
            </div>
            
            <Reveal delay={0.3} className="relative hidden lg:flex justify-center items-center">
              <Image src={concentracao} alt="Concentração" className="w-full max-w-lg h-auto object-contain hover:-translate-y-4 transition-transform duration-700 drop-shadow-[0_0_40px_rgba(91,227,200,0.15)]" />
            </Reveal>
          </div>
        </div>
      </section>
      {/* --- CTA STAND & COMPARTILHAMENTO --- */}
      <section className="py-24 border-t border-white/5 bg-bg-elev/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-attention/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-fg-strong mb-4">Pronto para testar sua concentração?</h2>
            <p className="text-lg text-fg leading-relaxed mb-8">
              Visite nosso stand no NEXT 2026!<br className="hidden sm:block" /> Conecte o sensor NeuroSky e assuma o poder da sua mente!
            </p>
            <div className="flex justify-center gap-4 mb-10">
               <span className="px-5 py-2 rounded-full border border-gold text-gold font-mono text-sm font-bold tracking-wide bg-gold/10">#NeuroRace</span>
               <span className="px-5 py-2 rounded-full border border-[#ff4d88] text-[#ff4d88] font-mono text-sm font-bold tracking-wide bg-[#ff4d88]/10">#NEXTFIAP</span>
            </div>

            {/* Redes Sociais */}
            <div className="flex flex-wrap justify-center gap-4">
              <a href="https://linkedin.com/shareArticle?mini=true&url=https://neurorace.fiap.com.br" target="_blank" rel="noopener noreferrer" className="glass-card px-6 py-3 flex items-center gap-3 hover:bg-white/5 transition-all hover:scale-105 text-fg-strong font-medium">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                LinkedIn
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="glass-card px-6 py-3 flex items-center gap-3 hover:bg-white/5 transition-all hover:scale-105 text-fg-strong font-medium">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --- SEÇÃO: JÁ JOGOU? --- */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
          <Reveal>
            <div className="glass-card p-10 md:p-16 text-center bg-[#0f1e2e]/40 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2rem] relative overflow-hidden">
              {/* Brilho interno do card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-attention/10 blur-[100px] rounded-full pointer-events-none"></div>
              
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-fg-strong mb-4 relative z-10">
                Já jogou no <span className="text-attention">NeuroRace?</span>
              </h2>
              <p className="text-lg text-fg leading-relaxed mb-10 max-w-2xl mx-auto relative z-10">
                Depois de passar pelo nosso stand, faça login para ter acesso ao diagnóstico completo do seu foco e descubra sua posição no ranking do NEXT.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                <ButtonLink href="/dashboard" className="w-full sm:w-auto px-8">
                  Conferir meu desempenho
                </ButtonLink>
                <ButtonLink href="/ranking" variant="secondary" className="w-full sm:w-auto px-8">
                  Checar ranking global
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
