"""
Consultas ao catálogo de jogos (catalogo.db).

Fornece busca por título (LIKE + FTS fallback), informações
detalhadas de jogo e resolução de título para jogos custom
(não-Steam) que não estão no proton_data.db.

O catálogo tem ~252MB com tabela games + índice FTS.
"""

from ..db.connection import _get_db


def _get_catalog_title(game_id: str) -> str | None:
    try:
        db = _get_db()
        row = db.execute(
            "SELECT title FROM games WHERE objectId = ?", (game_id,)
        ).fetchone()
        return row["title"] if row else None
    except Exception:
        return None


def get_game_info(game_id: str) -> dict | None:
    try:
        db = _get_db()
        cur = db.execute(
            "SELECT objectId, title, genres, releaseYear, minimum, recommended, "
            "developer, publisher, shortDescription "
            "FROM games WHERE objectId = ?",
            (game_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return dict(row)
    except Exception as e:
        print(f"[catalog] Erro ao buscar jogo {game_id}: {e}")
        return None


def search_games(query: str, limit: int = 20) -> list:
    try:
        db = _get_db()
        like_query = f"%{query}%"
        cur = db.execute(
            "SELECT objectId, title, genres, releaseYear, tier "
            "FROM games WHERE title LIKE ? "
            "ORDER BY length(title) ASC "
            "LIMIT ?",
            (like_query, limit)
        )
        results = [dict(row) for row in cur.fetchall()]

        if not results:
            cur = db.execute(
                "SELECT objectId, title, genres, NULL as releaseYear, NULL as tier "
                "FROM games_fts WHERE title MATCH ? "
                "LIMIT ?",
                (query, limit)
            )
            results = [dict(row) for row in cur.fetchall()]

        return results
    except Exception as e:
        print(f"[catalog] Erro na busca '{query}': {e}")
        return []
