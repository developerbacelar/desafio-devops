import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Building2 } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import { Badge } from "@/components/admin/ui/Badge";
import { StatCard } from "@/components/admin/ui/StatCard";

describe("Button", () => {
  it("renderiza como botao e chama onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Salvar</Button>);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respeita disabled", () => {
    render(<Button disabled>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});

describe("Badge", () => {
  it("renderiza o conteudo", () => {
    render(<Badge tone="success">ready</Badge>);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renderiza label e valor", () => {
    render(<StatCard icon={Building2} label="Empresas" value={3} />);
    expect(screen.getByText("Empresas")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
