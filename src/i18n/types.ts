import type { ptBR } from "./messages/pt-BR";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Todos os dicionários precisam ter exatamente as mesmas chaves do pt-BR. */
export type Messages = Widen<typeof ptBR>;

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T & string];

export type MessageKey = Paths<typeof ptBR>;
export type Vars = Record<string, string | number | null | undefined>;
