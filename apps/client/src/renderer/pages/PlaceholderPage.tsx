import { useI18n } from "../i18n";

export function PlaceholderPage({ label }: { label: string }): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="placeholder">
      <div className="placeholder-icon">🚧</div>
      <h2>{t(label)}</h2>
      <p className="muted">{t("placeholder.notBuilt")}</p>
    </div>
  );
}
