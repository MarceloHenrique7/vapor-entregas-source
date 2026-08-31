import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./privacidade/page";
import TermsPage from "./termos/page";
import OperationalRulesPage from "./regras/page";

type LegalProps = {
  title: string;
  version: string;
  sections: Array<{ title: string; content: string }>;
};
describe("páginas jurídicas públicas", () => {
  it("renderiza Termos versionados com pagamento direto e autonomia", () => {
    const page = TermsPage() as ReactElement<LegalProps>;
    const content = JSON.stringify(page.props.sections);
    expect(page.props.title).toBe("Termos de Uso");
    expect(page.props.version).toBe("1.1");
    expect(content).toContain("NÃO processa o pagamento");
    expect(content).toContain("sem jornada mínima");
  });
  it("renderiza Política versionada conforme localização e minimização reais", () => {
    const page = PrivacyPage() as ReactElement<LegalProps>;
    const content = JSON.stringify(page.props.sections);
    expect(page.props.title).toBe("Política de Privacidade");
    expect(page.props.version).toBe("1.1");
    expect(content).toContain("Não existe histórico GPS permanente");
    expect(content).toContain("Argon2id");
  });
  it("renderiza regras operacionais próprias sem alterar a autonomia", () => {
    const page = OperationalRulesPage() as ReactElement<LegalProps>;
    const content = JSON.stringify(page.props.sections);
    expect(page.props.title).toBe("Regras operacionais e adicionais");
    expect(page.props.version).toBe("1.0");
    expect(content).toContain("Transparência antes do aceite");
    expect(content).toContain("não realiza repasse");
  });
});
