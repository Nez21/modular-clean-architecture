/** biome-ignore-all lint/correctness/noUnusedVariables: False positive */
type Branded<TType, TBrand extends string> = TType & import('zod').z.BRAND<TBrand>
