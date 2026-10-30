export default function App() {
  return (
    <main className="foundation-preview space-y-space-xl">
      <header className="space-y-space-sm">
        <p className="text-label text-primary uppercase">Controle Financeiro · Etapa 2</p>
        <h1 className="text-heading md:text-display">Fundação visual</h1>
        <p className="max-w-2xl text-body-lg text-ink-secondary">
          Prévia de cores, tipografia e superfícies para revisão da identidade visual.
        </p>
        <a href="#typography" className="inline-block py-space-sm underline">
          Conferir tipografia
        </a>
      </header>

      <section aria-labelledby="palette" className="space-y-space-md">
        <h2 id="palette" className="text-subheading">Cores e superfícies</h2>
        <div className="foundation-preview__grid">
          {[
            { label: 'Ação principal', color: '#004AC6', classes: 'bg-primary text-on-primary' },
            { label: 'Receita', color: '#006E2D', classes: 'bg-income text-on-primary' },
            { label: 'Despesa', color: '#AE0010', classes: 'bg-expense text-on-primary' },
            { label: 'Pendente', color: '#FEF3C7', classes: 'bg-warning-subtle text-warning' },
          ].map(({ label, color, classes }) => (
            <div key={label} className={`rounded-card p-space-lg ${classes}`}>
              <p className="font-semibold">{label}</p>
              <p className="mt-space-sm text-caption">{color}</p>
            </div>
          ))}
        </div>
        <div className="rounded-card border border-border-subtle bg-surface p-space-lg shadow-card">
          <p className="font-semibold">Superfície principal</p>
          <p className="mt-space-sm text-ink-secondary">
            Fundo suave, cartões brancos, bordas discretas e sombra leve.
          </p>
        </div>
      </section>

      <section aria-labelledby="typography" className="space-y-space-md">
        <h2 id="typography" className="text-subheading">Tipografia e números</h2>
        <div className="rounded-card bg-surface p-space-lg shadow-card space-y-space-lg">
          <div className="space-y-space-sm">
            <p className="text-heading">Clareza em cada lançamento</p>
            <p className="text-body text-ink-secondary">
              Inter · Texto de leitura em 14 px, títulos de 24 a 32 px e métricas em 28 px.
            </p>
            <p className="text-caption text-ink-secondary">
              Acentuação: alimentação, salário, saúde e transações.
            </p>
          </div>
          <dl className="foundation-preview__grid financial-figure">
            <div>
              <dt className="text-caption text-ink-secondary">Receita de exemplo</dt>
              <dd className="mt-space-sm text-metric text-income">+ R$ 5.800,00</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-secondary">Despesa de exemplo</dt>
              <dd className="mt-space-sm text-metric text-expense">− R$ 2.379,50</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-secondary">Data de exemplo</dt>
              <dd className="mt-space-sm text-body-lg">24/10/2024</dd>
            </div>
          </dl>
        </div>
      </section>
      <p className="text-caption text-ink-secondary">
        Amostra visual estática. As páginas do sistema serão implementadas nas próximas etapas.
      </p>
    </main>
  )
}
