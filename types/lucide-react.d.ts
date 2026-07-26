declare module 'lucide-react' {
  import * as React from 'react';
  export type IconNode = React.ReactNode;
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    strokeWidth?: string | number;
  }
  export declare const ShieldCheck: React.ComponentType<LucideProps>;
  export declare const Sparkles: React.ComponentType<LucideProps>;
  export declare const TrendingUp: React.ComponentType<LucideProps>;
  export declare const ChevronLeft: React.ComponentType<LucideProps>;
  export declare const Trash: React.ComponentType<LucideProps>;
  export declare const Home: React.ComponentType<LucideProps>;
  export declare const ArrowLeft: React.ComponentType<LucideProps>;
  export declare const RefreshCw: React.ComponentType<LucideProps>;
  export declare const Search: React.ComponentType<LucideProps>;
  export declare const Check: React.ComponentType<LucideProps>;
  export declare const X: React.ComponentType<LucideProps>;
}
