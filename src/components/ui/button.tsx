import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-inline-xs whitespace-nowrap rounded-md text-body font-semibold leading-body transition-colors duration-base ease-standard focus-visible:outline-none focus-visible:ring-token disabled:pointer-events-none disabled:opacity-disabled',
  {
    variants: {
      variant: {
        default: 'bg-accent text-canvas shadow-sm hover:bg-accent-hover',
        ghost: 'text-text-muted hover:bg-surface-2 hover:text-text',
      },
      size: {
        sm: 'h-control-sm px-control-sm',
        default: 'h-control px-control',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button }
