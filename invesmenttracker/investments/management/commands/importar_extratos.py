import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from investments.importador import _executar_extracao_claude, aplicar_extrato


MESES_PT = {
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
}

NOME_ARQUIVO_RE = re.compile(r'(\d{4})-([a-zA-Zç]+)\.pdf$', re.IGNORECASE)


def _chave_ordenacao(caminho):
    m = NOME_ARQUIVO_RE.search(caminho.name)
    if not m:
        return (9999, 99)
    ano = int(m.group(1))
    mes_nome = m.group(2).lower().replace('ç', 'c')
    return (ano, MESES_PT.get(mes_nome, 99))


class Command(BaseCommand):
    help = (
        'Importa em lote os relatorios mensais consolidados da B3 (PDFs) de uma pasta, em '
        'ordem cronologica. Usa a secao "Negociacao" de cada mes (compra/venda) para calcular '
        'o preco medio de compra corretamente, e o snapshot de "Posicao" para atualizar '
        'valor/quantidade -- permitindo inferir lucro (resultado_total) depois.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dir', default=None,
            help='Pasta com os PDFs dos relatorios (default: reports/ na raiz do projeto)',
        )

    def handle(self, *args, **options):
        pasta = Path(options['dir']) if options['dir'] else Path(settings.BASE_DIR).parent / 'reports'
        if not pasta.is_dir():
            self.stderr.write(self.style.ERROR(f'Pasta não encontrada: {pasta}'))
            return

        arquivos = sorted(pasta.glob('*.pdf'), key=_chave_ordenacao)
        if not arquivos:
            self.stdout.write(self.style.WARNING(f'Nenhum PDF encontrado em {pasta}'))
            return

        self.stdout.write(f'{len(arquivos)} relatório(s) encontrado(s) em {pasta}, processando em ordem cronológica:\n')

        totais = {
            'posicoes_criadas': 0, 'posicoes_atualizadas': 0, 'dividendos_criados': 0,
            'compras_aplicadas': 0, 'vendas_aplicadas': 0,
        }
        falhas = []

        for caminho in arquivos:
            self.stdout.write(f'-> {caminho.name} ... ', ending='')
            self.stdout.flush()
            try:
                dados = _executar_extracao_claude(str(caminho), str(pasta))
                resumo = aplicar_extrato(dados)
            except (RuntimeError, ValueError) as e:
                falhas.append((caminho.name, str(e)))
                self.stdout.write(self.style.ERROR(f'ERRO: {e}'))
                continue

            for chave in totais:
                totais[chave] += resumo[chave]

            self.stdout.write(self.style.SUCCESS(
                f"OK ({resumo['mes_referencia']}): "
                f"{resumo['posicoes_criadas']} posição(ões) nova(s), {resumo['posicoes_atualizadas']} atualizada(s), "
                f"{resumo['compras_aplicadas']} compra(s), {resumo['vendas_aplicadas']} venda(s), "
                f"{resumo['dividendos_criados']} dividendo(s)"
            ))

        self.stdout.write('\nResumo final:')
        for chave, valor in totais.items():
            self.stdout.write(f'  {chave}: {valor}')

        if falhas:
            self.stdout.write(self.style.ERROR(f'\n{len(falhas)} arquivo(s) falharam:'))
            for nome, erro in falhas:
                self.stdout.write(f'  - {nome}: {erro}')
