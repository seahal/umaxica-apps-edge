type LinkDescriptor = {
  rel: string;
  href?: string;
  as?: string;
  crossOrigin?: string;
  title?: string;
  type?: string;
  integrity?: string;
  media?: string;
  referrerPolicy?: string;
  sizes?: string;
  imageSrcSet?: string;
  imageSizes?: string;
};

type MetaDescriptor =
  | { charSet: string }
  | { title: string }
  | {
      name: string;
      content?: string;
    }
  | {
      property: string;
      content?: string;
    }
  | {
      httpEquiv: string;
      content?: string;
    };

export namespace Route {
  export type LinksFunction = () => LinkDescriptor[] | Promise<LinkDescriptor[]>;

  export type MetaFunction = (args: unknown) => MetaDescriptor[] | Promise<MetaDescriptor[]>;

  export interface LoaderArgs {
    context?: {
      security?: {
        nonce?: string;
      };
      runtime?: {
        env?: Record<string, string>;
      };
    };
  }
}
