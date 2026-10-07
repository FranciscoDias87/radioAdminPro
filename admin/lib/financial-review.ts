export type FinancialKind = 'receipt' | 'commission' | 'reverseReceipt' | 'reverseCommission';
export type FinancialReview = {
  payload: Record<string, unknown>;
  label: string;
  effect: string;
  lines: [string, string][];
};

export function financialReview(input: {
  kind: FinancialKind; contractId: string; campaign: string; client: string;
  speaker: string; expected: string; amountCents: number; date: string;
  method: string; note: string; invoiceId?: string; invoiceNumber?: number;
  paymentId?: string;
}): FinancialReview {
  const reversal = input.kind.startsWith('reverse');
  const receipt = input.kind === 'receipt' || input.kind === 'reverseReceipt';
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Informe um valor positivo.');
  if (!input.expected || !input.contractId || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Atualize os dados antes de confirmar.');
  if (reversal && (!input.paymentId || input.note.trim().length < 5)) throw new Error('Informe o motivo do estorno.');
  if (input.kind === 'receipt' && !input.invoiceId) throw new Error('Selecione a parcela.');
  const label = reversal ? 'Confirmar estorno' : receipt ? 'Confirmar recebimento' : 'Confirmar repasse';
  return {
    label,
    effect: reversal
      ? 'O estorno gera um novo registro. O lançamento original permanece no histórico.'
      : receipt ? 'Este valor será registrado como recebido. Isso não homologa o contrato.'
      : 'Este valor será registrado como comissão paga ao locutor.',
    payload: {
      action: input.kind, contractId: input.contractId, expected: input.expected,
      date: input.date, note: input.note,
      ...(reversal ? {paymentId: input.paymentId} : {
        amountCents: input.amountCents, method: input.method,
        ...(receipt ? {invoiceId: input.invoiceId} : {}),
      }),
    },
    lines: [
      ['Anunciante', input.client], ['Campanha', input.campaign],
      ...(!receipt ? [['Locutor', input.speaker] as [string, string]] : []),
      ...(input.invoiceNumber ? [['Parcela', String(input.invoiceNumber)] as [string, string]] : []),
      ['Valor', new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(input.amountCents / 100)],
      ['Data', input.date.split('-').reverse().join('/')],
      ...(!reversal ? [['Forma de pagamento', input.method] as [string, string]] : []),
      ...(input.note ? [[reversal ? 'Motivo' : 'Observação', input.note] as [string, string]] : []),
    ],
  };
}
