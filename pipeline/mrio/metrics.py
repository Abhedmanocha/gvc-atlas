"""Every metric, defined once. Formulas and units: docs/data.md.

Node n = economy*35 + sector. A row is (economy, r) with r = 0..34 the sectors c1..c35,
35 = all (whole economy), 36 = mfg (c3..c16). Every row metric is a ratio of flows summed
over the row's nodes, so sectors and aggregates share one code path (`membership`).
"""
import numpy as np

NE, NS = 73, 35
N = NE * NS
ROWS = NS + 2  # c1..c35, all, mfg
MFG = np.arange(2, 16)
ECON = np.arange(N) // NS  # home economy of each node
OWN = ECON[None, :] == np.arange(NE)[:, None]  # OWN[c, n]: node n belongs to economy c
NSUP = 0.01  # threshold for counting a supplier economy, value added per $ of output


def membership():
    """S[n, e*37 + r] = 1 if node n is part of row r of economy e."""
    S = np.zeros((N, NE * ROWS))
    for e in range(NE):
        nodes = e * NS + np.arange(NS)
        S[nodes, e * ROWS + np.arange(NS)] = 1
        S[nodes, e * ROWS + NS] = 1
        S[nodes[MFG], e * ROWS + NS + 1] = 1
    return S


def by_economy(M):
    """Sum the leading (node) axis within each economy: (N, ...) -> (73, ...)."""
    return M.reshape(NE, NS, *M.shape[1:]).sum(1)


def by_sector(M):
    """Sum the leading (node) axis within each sector over economies: (N, ...) -> (35, ...)."""
    return M.reshape(NE, NS, *M.shape[1:]).sum(0)


def domestic(M):
    """Keep only the economy-diagonal blocks of an N x N matrix."""
    return np.where(ECON[:, None] == ECON[None, :], M, 0)


def coefficients(Z, x):
    """A = Z / x and v = 1 - column sum of A (value added incl. net product taxes); 0 where x = 0."""
    A = Z / np.where(x > 0, x, 1)
    return A, np.where(x > 0, 1 - A.sum(0), 0)


def origin(v, B):
    """G[c, j]: value added of economy c embodied in $1 of output of node j."""
    return by_economy(v[:, None] * B)


def routes(G, A):
    """Split G[c, j] - v_j[c = home] by the economy that sells j the input carrying it.

    direct: bought straight from c (0 when c is j's own economy), home: bought from j's own
    economy, third: bought from any other economy.
    """
    home = G @ domestic(A)
    direct = np.where(OWN, 0, np.where(OWN, G, 0) @ A)
    return direct, home, G @ A - home - direct


def exports(Z, F):
    """D[n, d]: gross exports of node n to economy d, intermediate + final (0 for its own economy)."""
    D = Z.reshape(N, NE, NS).sum(2) + F.reshape(N, NE, -1).sum(2)
    D[np.arange(N), ECON] = 0
    return D


def participation(A, v, F, E):
    """Borin & Mancini (2019), source-based, by exporting node. Returns flows (dva, gvc_f).

    m = v (I - A_d)^-1: domestic value added per $ of the node's exports (DVA = m E).
    Traditional trade (DAVAX) = m (final exports + intermediate exports absorbed by the direct
    importer's own final demand, A_f (I - A_d)^-1 y_dom). Backward = 1 - DVA/E, forward = (DVA - DAVAX)/E.
    """
    Ad = domestic(A)
    L = np.linalg.inv(np.eye(N) - Ad)
    m = v @ L
    Fd = F.reshape(N, NE, -1).sum(2)
    y_dom = Fd[np.arange(N), ECON]
    absorbed = (A - Ad) @ (L @ y_dom)
    return m * E, m * (E - (Fd.sum(1) - y_dom) - absorbed)


def upstreamness(Z, x):
    """Antràs et al. (2012): U = (I - D)^-1 1 with D = Z / x row-wise (share of i's output sold to j)."""
    D = Z / np.where(x > 0, x, 1)[:, None]
    return np.linalg.solve(np.eye(N) - D, np.ones(N))


def vax(v, B, F):
    """Value added of each node absorbed by final demand outside its own economy."""
    BY = B @ F.reshape(N, NE, -1).sum(2)
    return v * (BY.sum(1) - BY[np.arange(N), ECON])


def year(Z, F, x):
    """All metrics for one table, per row (73*37 rows, economy-major). Arrays are (rows, k)."""
    A, v = coefficients(Z, x)
    B = np.linalg.inv(np.eye(N) - A)
    G = origin(v, B)
    direct, home, third = routes(G, A)
    D = exports(Z, F)
    E = D.sum(1)
    dva, fwd = participation(A, v, F, E)
    S = membership()
    X, EX = x @ S, E @ S
    with np.errstate(divide="ignore", invalid="ignore"):
        per_dollar = lambda M: ((M * x) @ S / X).T  # per $ of the row's output
        imp_flow = by_sector(np.where(OWN[ECON], 0, Z)) @ S  # Z from other economies, by product
        out = dict(
            va=per_dollar(G),
            direct=per_dollar(direct),
            home=per_dollar(home),
            third=per_dollar(third),
            inputs=(by_economy(Z) @ S / X).T,
            dest=(D.T @ S).T,
            imp=(imp_flow / X).T,
            impsh=(imp_flow / (by_sector(Z) @ S)).T,
        )
        h = np.repeat(np.arange(NE), ROWS)
        foreign = np.where(np.arange(NE)[None, :] == h[:, None], 0, out["va"])
        fva = foreign.sum(1)
        V = (vax(v, B, F) @ S).reshape(NE, ROWS)
        out.update(
            x=X,
            e=EX,
            own=(v * x) @ S / X,
            fva=fva,
            fdirect=out["direct"].sum(1),
            hhi=((foreign / fva[:, None]) ** 2).sum(1),
            top=foreign[:, :-1].argmax(1),  # named economies only: RoW is not a supplier one can name
            topva=foreign[:, :-1].max(1),
            nsup=(foreign >= NSUP).sum(1),
            imports=out["imp"].sum(1),
            gvc_b=1 - dva @ S / EX,
            gvc_f=fwd @ S / EX,
            up=(upstreamness(Z, x) * x) @ S / X,
            rca=((V / V[:, [NS]]) / (V.sum(0) / V[:, NS].sum())).ravel(),
        )
    empty = ~(X > 0)  # rows with no output: no supplier structure to report
    for k in ("hhi", "top", "topva", "nsup"):
        out[k] = np.where(empty | ~(fva > 0), np.nan, out[k])
    return out
