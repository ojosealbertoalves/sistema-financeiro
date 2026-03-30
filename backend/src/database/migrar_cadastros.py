"""
Migra cadastros da planilha.xlsx para o banco database.sqlite.
Uso: python migrar_cadastros.py
"""

import warnings
warnings.filterwarnings("ignore")

import sqlite3
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
XLSX_PATH = BASE_DIR / "planilha.xlsx"
DB_PATH   = BASE_DIR.parent.parent / "database.sqlite"


def limpa(valor):
    """Converte NaN / None / espaços em branco para None."""
    if valor is None:
        return None
    s = str(valor).strip()
    if s.lower() in ("nan", "none", ""):
        return None
    return s


def migrar_fornecedores(conn, df_raw):
    df = df_raw.copy()
    df.columns = ["nome", "cnpj_cpf", "telefone", "email"]
    df = df.iloc[1:]  # pula cabeçalho da planilha

    cur = conn.cursor()
    inseridos = ignorados = 0

    for _, row in df.iterrows():
        nome = limpa(row["nome"])
        if not nome:
            continue

        existe = cur.execute(
            "SELECT 1 FROM fornecedores WHERE nome = ?", (nome,)
        ).fetchone()

        if existe:
            ignorados += 1
            continue

        cur.execute(
            """
            INSERT INTO fornecedores (nome, cnpj_cpf, telefone, email)
            VALUES (?, ?, ?, ?)
            """,
            (nome, limpa(row["cnpj_cpf"]), limpa(row["telefone"]), limpa(row["email"])),
        )
        inseridos += 1

    conn.commit()
    print(f"  Fornecedores: {inseridos} inseridos, {ignorados} ignorados (já existiam)")


def migrar_contas(conn, df_raw):
    df = df_raw.copy()
    df.columns = ["banco", "numero_conta", "nome"]
    df = df.iloc[1:]  # pula cabeçalho da planilha

    cur = conn.cursor()
    inseridos = ignorados = 0

    for _, row in df.iterrows():
        banco = limpa(row["banco"])
        if not banco:
            continue

        nome = limpa(row["nome"]) or banco

        existe = cur.execute(
            "SELECT 1 FROM contas WHERE nome = ?", (nome,)
        ).fetchone()

        if existe:
            ignorados += 1
            continue

        cur.execute(
            """
            INSERT INTO contas (nome, banco, numero_conta)
            VALUES (?, ?, ?)
            """,
            (nome, banco, limpa(row["numero_conta"])),
        )
        inseridos += 1

    conn.commit()
    print(f"  Contas: {inseridos} inseridas, {ignorados} ignoradas (já existiam)")


def migrar_categorias(conn, df_raw):
    df = df_raw.copy()
    df.columns = ["subcategoria", "nivel2", "nivel1"]
    df = df.iloc[1:]  # pula cabeçalho da planilha

    cur = conn.cursor()
    inseridos = ignorados = 0

    for _, row in df.iterrows():
        subcategoria = limpa(row["subcategoria"])
        if not subcategoria:
            continue

        nivel2 = limpa(row["nivel2"])
        nivel1 = limpa(row["nivel1"])

        existe = cur.execute(
            "SELECT 1 FROM categorias WHERE subcategoria = ?", (subcategoria,)
        ).fetchone()

        if existe:
            ignorados += 1
            continue

        cur.execute(
            """
            INSERT INTO categorias (subcategoria, classificacao, nivel1, nivel2)
            VALUES (?, ?, ?, ?)
            """,
            (subcategoria, nivel2, nivel1, nivel2),
        )
        inseridos += 1

    conn.commit()
    print(f"  Categorias: {inseridos} inseridas, {ignorados} ignoradas (já existiam)")


def main():
    if not XLSX_PATH.exists():
        print(f"ERRO: planilha não encontrada em {XLSX_PATH}")
        return

    if not DB_PATH.exists():
        print(f"ERRO: banco não encontrado em {DB_PATH}")
        print("Inicie o servidor ao menos uma vez para criar o banco.")
        return

    print(f"Lendo: {XLSX_PATH}")
    print(f"Banco:  {DB_PATH}\n")

    # Carrega as três abas de uma vez (evita abrir o arquivo três vezes)
    abas = pd.read_excel(
        XLSX_PATH,
        sheet_name=[
            "CADASTROS DE FORNECEDORES",
            "Contas dos banco",
            "Classifica\u00e7\u00e3o",   # Classificação
        ],
        header=None,
    )

    conn = sqlite3.connect(DB_PATH)

    try:
        print("Importando...")
        migrar_fornecedores(conn, abas["CADASTROS DE FORNECEDORES"])
        migrar_contas(conn, abas["Contas dos banco"])
        migrar_categorias(conn, abas["Classifica\u00e7\u00e3o"])
        print("\nMigração concluída com sucesso.")
    except Exception as e:
        conn.rollback()
        print(f"\nERRO durante a migração: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
