export const Typography = {
  Heading: ({ level, children, className }: any) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements
    return <Tag className={className}>{children}</Tag>
  },
  Paragraph: ({ children, className }: any) => {
    return <p className={className}>{children}</p>
  },
  Link: ({ children, className, href }: any) => {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    )
  },
}

