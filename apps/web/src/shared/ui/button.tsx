import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

const buttonVariants = cva('cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out active:translate-y-0 active:scale-[.98] [&_svg]:size-4 [&_svg]:shrink-0', {
    variants: {
        variant: {
            default: 'bg-primary text-primary-foreground shadow-[0_7px_18px_rgba(32,91,67,.18)] hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_10px_22px_rgba(32,91,67,.24)]',
            destructive: 'bg-destructive text-destructive-foreground shadow-[0_7px_18px_rgba(188,75,81,.18)] hover:-translate-y-0.5 hover:bg-destructive/90',
            outline: 'border border-line bg-card shadow-[0_4px_12px_rgba(23,63,50,.055)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white hover:shadow-[0_7px_18px_rgba(23,63,50,.09)]',
            secondary: 'bg-secondary text-secondary-foreground shadow-[0_4px_12px_rgba(23,63,50,.045)] hover:-translate-y-0.5 hover:bg-secondary/80',
            ghost: 'shadow-none hover:bg-foreground/6.5 hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
        },
        size: {
            default: 'h-9 px-4 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
            xs: "h-6 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
            sm: "h-8 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
            lg: 'h-10 px-5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
            icon: 'size-9',
            'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
            'icon-sm': 'size-8',
            'icon-lg': 'size-10',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
})

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
