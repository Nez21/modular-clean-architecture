type Branded<TType, TBrand extends string | number | symbol> = TType & import('zod').z.BRAND<TBrand>
