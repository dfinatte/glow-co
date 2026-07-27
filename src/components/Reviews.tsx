import { Star } from 'lucide-react';

const REVIEWS = [
  { name: 'Camila R.', rating: 5, text: 'Melhor compra do ano! Uso todos os dias, a cor Rosa Malvada é perfeita e realmente não fica pegajoso no calor do Rio.' },
  { name: 'Fernanda L.', rating: 5, text: 'Minha rotina de manhã agora leva 2 minutos. Passei de base, corretivo, blush e pó pra só o bastão. O FPS 95 me deixa super tranquila.' },
  { name: 'Mariana G.', rating: 5, text: 'Textura aveludada, desliza na pele e rende MUITO. Comprei o trio e valeu cada centavo.' },
  { name: 'Beatriz A.', rating: 5, text: 'Eu tenho pele super oleosa e tinha medo de usar em bastão, mas o toque é incrivelmente seco. Recomendo demais!' },
];

export default function Reviews() {
  return (
    <section className="px-4 py-20 bg-secondary/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">O que elas dizem</h2>
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 fill-current" />)}
          </div>
          <p className="text-foreground/70 font-medium tracking-wide">4.9/5 baseado em 847 avaliações</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {REVIEWS.map((review, i) => (
            <div key={i} className="bg-card p-8 rounded-[2rem] shadow-sm border border-border/50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 text-amber-500 mb-6">
                 {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-foreground/90 text-base md:text-lg mb-6 leading-relaxed font-serif italic">"{review.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-serif font-bold">
                  {review.name.charAt(0)}
                </div>
                <p className="text-sm font-bold text-foreground/80 tracking-wide">{review.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
