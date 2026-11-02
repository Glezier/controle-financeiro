import { useEffect, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { Icon } from '../components/ui/Icon'
import { SelectField, TextField } from '../components/forms/Field'
import { Feedback } from '../components/feedback/Feedback'

export function ComponentsPreview() {
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState(false)
  const [errorVisible, setErrorVisible] = useState(true)
  useEffect(() => {
    document.title = 'Amostra de componentes | Controle Financeiro'
  }, [])
  return (
    <div className="space-y-space-lg">
      <header>
        <p className="mb-space-sm text-label uppercase text-primary">Etapa 3 · Revisão</p>
        <h1 className="text-heading md:text-display">Componentes compartilhados</h1>
        <p className="mt-space-sm text-ink-secondary">
          Amostra para revisão visual e de interação. Os dados abaixo são apenas exemplos.
        </p>
      </header>
      <Card>
        <h2 className="mb-space-md text-subheading">Ações e identificação</h2>
        <div className="flex flex-wrap gap-space-sm">
          <Button onClick={() => setModalOpen(true)}>
            <Icon name="plus" />
            Abrir modal de exemplo
          </Button>
          <Button variant="secondary" onClick={() => setNotice(true)}>
            Mostrar feedback
          </Button>
          <Button variant="danger" disabled>
            Excluir indisponível
          </Button>
          <Button loading>Carregando exemplo</Button>
        </div>
        <div className="mt-space-lg flex flex-wrap gap-space-sm">
          <Badge tone="income">Receita</Badge>
          <Badge tone="expense">Despesa</Badge>
          <Badge tone="pending">Pendente</Badge>
          <Badge>Efetivada</Badge>
        </div>
        {notice && (
          <div className="mt-space-md">
            <Feedback
              kind="success"
              title="Feedback de exemplo exibido"
              action={
                <Button variant="ghost" onClick={() => setNotice(false)}>
                  Dispensar aviso
                </Button>
              }
            >
              Nenhuma operação financeira foi realizada.
            </Feedback>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-space-md text-subheading">Campos de formulário</h2>
        <div className="preview-grid">
          <TextField
            label="Descrição de exemplo"
            placeholder="Ex.: material de estudo"
            hint="Campo demonstrativo, sem envio de dados."
          />
          <SelectField label="Tipo de exemplo" defaultValue="expense">
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </SelectField>
          <TextField
            label="Valor com erro de exemplo"
            defaultValue="0,00"
            error="Informe um valor maior que zero."
            inputMode="decimal"
          />
          <TextField
            label="Campo indisponível"
            disabled
            placeholder="Disponível em uma próxima etapa"
          />
        </div>
      </Card>
      <Card>
        <h2 className="mb-space-md text-subheading">Tabela e status</h2>
        <DataTable caption="Transações ilustrativas para revisão dos componentes">
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Tipo</th>
              <th scope="col">Data</th>
              <th scope="col" className="amount-cell">
                Valor
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Bolsa de pesquisa · exemplo</th>
              <td>
                <Badge tone="income">Receita</Badge>
              </td>
              <td className="financial-figure">05/10/2024</td>
              <td className="amount-cell text-income">+ R$ 1.000,00</td>
              <td>
                <Badge>Efetivada</Badge>
              </td>
            </tr>
            <tr>
              <th scope="row">Material de estudo · exemplo</th>
              <td>
                <Badge tone="expense">Despesa</Badge>
              </td>
              <td className="financial-figure">10/10/2024</td>
              <td className="amount-cell text-expense">− R$ 150,00</td>
              <td>
                <Badge tone="pending">Pendente</Badge>
              </td>
            </tr>
          </tbody>
        </DataTable>
      </Card>
      <section aria-labelledby="feedback-heading" className="space-y-space-md">
        <h2 id="feedback-heading" className="text-subheading">
          Estados de feedback
        </h2>
        <Feedback kind="loading" title="Carregamento de exemplo">
          Aguarde enquanto os dados são preparados.
        </Feedback>
        <Feedback kind="empty" title="Nenhum resultado de exemplo">
          Tente outro período ou altere os filtros.
        </Feedback>
        {errorVisible ? (
          <Feedback
            kind="error"
            title="Erro de exemplo"
            action={
              <Button variant="secondary" onClick={() => setErrorVisible(false)}>
                Dispensar erro de exemplo
              </Button>
            }
          >
            Esta mensagem demonstra a apresentação de falhas.
          </Feedback>
        ) : (
          <Button variant="secondary" onClick={() => setErrorVisible(true)}>
            Mostrar erro de exemplo
          </Button>
        )}
      </section>
      <Modal title="Modal de exemplo" open={modalOpen} onClose={() => setModalOpen(false)}>
        <p className="text-ink-secondary">
          Abertura, foco, rolagem e fechamento compartilhados entre as próximas telas.
        </p>
        <div className="mt-space-lg">
          <TextField label="Campo dentro do modal" placeholder="Digite para conferir o foco" />
        </div>
        <div className="mt-space-lg flex justify-end">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Fechar exemplo
          </Button>
        </div>
      </Modal>
    </div>
  )
}
