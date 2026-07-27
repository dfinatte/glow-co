import { Check, X } from 'lucide-react';

export default function ComparisonBlock() {
  return (
    <section className="px-4 py-16 md:py-24 bg-secondary/15 my-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-12 text-foreground">Por que mudar para o Bastão Ollie?</h2>
        
        <div className="bg-card rounded-3xl shadow-xl shadow-muted/50 border border-border overflow-hidden">
          <div className="grid grid-cols-2 text-sm md:text-base">
            {/* Headers */}
            <div className="p-6 md:p-8 bg-muted/50 border-r border-border font-semibold text-muted-foreground text-center">
              Maquiagem Tradicional
            </div>
            <div className="p-6 md:p-8 bg-primary text-primary-foreground font-bold text-center text-lg shadow-inner">
              Bastão Ollie
            </div>

            {/* Row 1 */}
            <div className="p-6 border-b border-r border-border flex items-center justify-center gap-3 text-muted-foreground">
              <X className="w-5 h-5 text-red-400 shrink-0" />
              <span>Ocupa muito espaço (3 itens)</span>
            </div>
            <div className="p-6 border-b border-border flex items-center justify-center gap-3 font-medium text-foreground bg-primary/5">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>Substitui 3 itens na bolsa</span>
            </div>

            {/* Row 2 */}
            <div className="p-6 border-b border-r border-border flex items-center justify-center gap-3 text-muted-foreground">
              <X className="w-5 h-5 text-red-400 shrink-0" />
              <span>Sem proteção solar</span>
            </div>
            <div className="p-6 border-b border-border flex items-center justify-center gap-3 font-medium text-foreground bg-primary/5">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>Proteção FPS 95 e Luz Azul</span>
            </div>

            {/* Row 3 */}
            <div className="p-6 border-b border-r border-border flex items-center justify-center gap-3 text-muted-foreground">
              <X className="w-5 h-5 text-red-400 shrink-0" />
              <span>Derrete e fica oleosa</span>
            </div>
            <div className="p-6 border-b border-border flex items-center justify-center gap-3 font-medium text-foreground bg-primary/5">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>Textura toque seco o dia todo</span>
            </div>

            {/* Row 4 */}
            <div className="p-6 border-r border-border flex items-center justify-center gap-3 text-muted-foreground">
              <X className="w-5 h-5 text-red-400 shrink-0" />
              <span>Demora na aplicação</span>
            </div>
            <div className="p-6 border-border flex items-center justify-center gap-3 font-medium text-foreground bg-primary/5">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <span>Pronta em 2 minutos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
