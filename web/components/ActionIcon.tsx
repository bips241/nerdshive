import { Button, ButtonProps } from "@/components/ui/button";

type Props = Partial<ButtonProps> & {
  children: React.ReactNode;
};

function ActionIcon({ children, ...buttonProps }: Props) {
  return (
    <Button
      type="button"
      variant={"ghost"}
      size={"icon"}
      className="h-9 w-9"
      {...buttonProps}
    >
      {children}
    </Button>
  );
}

export default ActionIcon;