import * as React from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  type AlertDialogContentProps,
} from '@/components/animate-ui/components/radix/alert-dialog';
import { Button } from '@/components/ui/button';

type BtnSuscribeProps = React.ComponentPropsWithoutRef<typeof Button> & {
  from: AlertDialogContentProps['from'];
};

export const BtnSuscribe = React.forwardRef<HTMLButtonElement, BtnSuscribeProps>(
  ({ from, className, children = 'Suscribirme', ...buttonProps }, ref) => {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            ref={ref}
            className={className}
            {...buttonProps}
          >
            {children}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent from={from} className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Información Importante</AlertDialogTitle>
            <AlertDialogDescription>
              Al suscribirte estás de acuerdo en recibir correos con promociones, drops exclusivos y más grasita!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

BtnSuscribe.displayName = 'BtnSuscribe';