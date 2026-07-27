export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  tagline: string;
  description: string;
  highlights: string[];
};

export const CATALOG: Product[] = [
  {
    id: 'lily-spray-cabelo',
    name: 'O Boticário Lily Spray Perfumado Para Cabelos (50ml)',
    price: 119.90,
    image: 'https://http2.mlstatic.com/D_NQ_NP_953472-MLA107540655798_032026-O-o-boticario-lily-spray-perfumado-para-cabelos-50ml.webp',
    category: 'cabelo',
    tagline: 'O segredo para fios perfumados, brilhantes e sem frizz o dia todo.',
    description:
      'Com a fragrância sofisticada e marcante de Lily, este spray capilar forma uma névoa leve que neutraliza odores externos — como poluição e cigarro — sem pesar ou ressecar o cabelo. Perfeito para levar na bolsa e garantir aquele toque de luxo e frescor a qualquer hora.',
    highlights: [
      'Fragrância sofisticada que neutraliza odores externos',
      'Névoa ultra leve — não pesa nem resseca os fios',
      'Compacto: perfeito para retoques rápidos na bolsa',
    ],
  },
  {
    id: 'serum-principia',
    name: 'Sérum Hidratante Principia 2% Ácidos Hialurônicos + B5',
    price: 79.90,
    image: 'https://images.tcdn.com.br/img/img_prod/468484/90_serum_hidratante_principia_2_acidos_hialuronicos_b5_principia_4739_1_18e36104d0068de574897ddc6fe01bec.jpeg',
    category: 'skincare',
    tagline: 'Hidratação profunda que preenche linhas e devolve o viço natural da sua pele.',
    description:
      'Combinando dois tipos de ácido hialurônico com a Vitamina B5, este sérum de textura leve e rápida absorção atua diretamente nas camadas profundas da pele, controlando a descamação e melhorando a firmeza. Ideal para a sua rotina de skincare diária antes da maquiagem.',
    highlights: [
      '2 tipos de ácido hialurônico + Vitamina B5',
      'Textura leve com absorção ultra rápida',
      'Ideal como base para a maquiagem diária',
    ],
  },
  {
    id: 'blush-oceane-cloudy',
    name: 'Blush em Bastão Stick Océane Edition (12g) - Cloudy Pink',
    price: 75.00,
    image: 'https://m.media-amazon.com/images/I/61m-gQSHYoL.jpg',
    category: 'maquiagem',
    tagline: 'Tom rosa clássico perfeito em formato ultra prático.',
    description:
      'Com alta pigmentação e textura cremosa que se transforma em acabamento aveludado na pele, o Stick Océane Cloudy Pink garante aquele efeito de "saúde natural" que dura o dia inteiro. Espalha super fácil com os dedos ou com esponja, sem manchar e sem arrancar a base.',
    highlights: [
      'Alta pigmentação com acabamento aveludado',
      'Efeito "saúde natural" de longa duração',
      'Não arranca a base — aplica com dedos ou esponja',
    ],
  },
  {
    id: 'po-translucido-cover',
    name: 'Pó Facial Translúcido (Cover Me Up)',
    price: 69.90,
    image: 'https://cdn.dooca.store/148163/products/po-solto-traslucido-1.jpeg?v=1750962245',
    category: 'maquiagem',
    tagline: 'Sela a maquiagem cremosa e controla a oleosidade por horas.',
    description:
      'Com textura ultra fina e invisível que não estoura no flash e não acumula nas linhas de expressão, o Pó Cover Me Up entrega um acabamento matte natural e prolonga a durabilidade de blushes e bases em bastão ao longo do dia.',
    highlights: [
      'Textura ultra fina — invisível, não estoura no flash',
      'Não acumula nas linhas de expressão',
      'Prolonga blushes e bases em bastão',
    ],
  },
  {
    id: 'bruma-dailus',
    name: 'Bruma Dailus Fix Tudo (150ml)',
    price: 59.90,
    image: 'https://http2.mlstatic.com/D_NQ_NP_2X_653973-MLB113721540948_072026-F-bruma-facial-fix-tudo-150ml-dailus.webp',
    category: 'maquiagem',
    tagline: 'Praticidade e cor radiante para levar na necessaire do dia a dia.',
    description:
      'A Bruma Fix Tudo da Dailus sela e revitaliza a maquiagem com uma névoa refrescante que prolonga a durabilidade da make por horas. Hidrata, refresca e devolve o viço da pele com apenas alguns sprays, perfeita para retoques rápidos em qualquer momento do dia.',
    highlights: [
      'Sela e prolonga a durabilidade da maquiagem',
      'Névoa refrescante que hidrata e revitaliza',
      'Perfeita para retoques rápidos a qualquer hora',
    ],
  },
  {
    id: 'oleo-mari-maria',
    name: 'Óleo Reparador 3 Em 1 Mari Maria Hair Ox Vita Glow (60ml)',
    price: 55.00,
    image: 'https://cdn.awsli.com.br/2500x2500/2752/2752602/produto/280870663/648818-2-ca8uslhrwf.jpg',
    category: 'cabelo',
    tagline: 'Nutrição intensa, brilho espelhado e selagem de pontas em um único produto.',
    description:
      'Assinado por Mari Maria, este óleo reparador une a tecnologia da linha Ox com um complexo de vitaminas que protege o cabelo contra o calor do secador e da chapinha, eliminando o frizz sem deixar o cabelo com aspecto oleoso ou pesado.',
    highlights: [
      'Tecnologia Ox + complexo de vitaminas reparadoras',
      'Protege contra calor de secador e chapinha',
      'Elimina frizz sem deixar aspecto oleoso',
    ],
  },
];
