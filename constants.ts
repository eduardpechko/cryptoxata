import { Project, User } from './types';

export const USERS: User[] = ['Ед', 'Вася', 'Ден'];

export const INITIAL_PROJECTS: Project[] = [
  { 
    id: 'p1', 
    name: 'Ethereal', 
    ticker: 'ETRL',
    defillamaId: 'ethereal-dex',
    description: 'Ethereal — це високопродуктивна децентралізована біржа на базі Ethena Network (L3), розроблена для забезпечення продуктивності CEX при збереженні самостійного зберігання активів DEX.',
    links: {
      docs: 'https://docs.ethereal.trade/',
      defillama: 'https://defillama.com/protocol/ethereal-dex',
      website: 'https://ethereal.trade/'
    }
  },
  { 
      id: 'p2', 
      name: 'NADO', 
      ticker: 'NADO',
      description: 'Nado is a prediction market protocol.',
      // No fake metrics here, waiting for real integration or manual entry via API
  },
];

export const STORAGE_KEY = 'airdrop_tracker_v1';