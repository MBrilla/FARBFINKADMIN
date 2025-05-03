export interface Project {
  id: string;
  title: string;
  description: string;
  categories: string[];
  image: string | null;
  images: string[] | null;
  created_at: string;
  kunde: string;
  standort: string;
  datum: string;
  flache: string;
}

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'energiestationen', label: 'ENERGIESTATIONEN' },
  { id: 'fassaden', label: 'FASSADEN' },
  { id: 'innenraume', label: 'INNENRÄUME' },
  { id: 'objekte', label: 'OBJEKTE' },
  { id: 'leinwande', label: 'LEINWÄNDE' }
]; 