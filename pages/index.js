import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { pokeApi } from '../api';
import styles from '../styles/Home.module.css';

const LIMIT = 12;
const GENERATIONS = {
  1: 'Generación I · Kanto', 2: 'Generación II · Johto', 3: 'Generación III · Hoenn',
  4: 'Generación IV · Sinnoh', 5: 'Generación V · Unova', 6: 'Generación VI · Kalos',
  7: 'Generación VII · Alola', 8: 'Generación VIII · Galar', 9: 'Generación IX · Paldea',
};
const label = (value) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const number = (value) => String(value).padStart(3, '0');

function evolutionMembers(node, members = []) {
  const id = Number(node.species.url.split('/').filter(Boolean).pop());
  members.push({ id, name: node.species.name });
  node.evolves_to.forEach((next) => evolutionMembers(next, members));
  return members;
}

async function pokemonRecord(url) {
  const resourceId = url.split('/').filter(Boolean).pop();
  const detailUrl = url.includes('pokemon-species') ? `/pokemon/${resourceId}` : url;
  const { data: detail } = await pokeApi.get(detailUrl);
  const { data: species } = await pokeApi.get(detail.species.url);
  const { data: evolution } = await pokeApi.get(species.evolution_chain.url);
  const spanishDescription = species.flavor_text_entries.find(({ language }) => language.name === 'es')?.flavor_text.replace(/[\n\f]/g, ' ');
  const latestMove = (move) => move.version_group_details.at(-1) || {};

  return {
    id: detail.id, name: detail.name, height: detail.height, weight: detail.weight, base_experience: detail.base_experience,
    abilities: detail.abilities, moves: detail.moves.slice(0, 8).map((move) => ({ name: move.move.name, level: latestMove(move).level_learned_at, method: latestMove(move).move_learn_method?.name || 'desconocido' })),
    order: detail.order, species: { description: spanishDescription, color: species.color.name, habitat: species.habitat?.name }, evolution: evolutionMembers(evolution.chain), types: detail.types, stats: detail.stats,
    sprites: { front_default: detail.sprites.front_default, gallery: { front_default: detail.sprites.front_default, back_default: detail.sprites.back_default, front_shiny: detail.sprites.front_shiny, back_shiny: detail.sprites.back_shiny }, other: { 'official-artwork': { front_default: detail.sprites.other?.['official-artwork']?.front_default } } },
  };
}

export default function Home({ pokemon, initialSpecies }) {
  const [pokemonList, setPokemonList] = useState(pokemon);
  const [generationSpecies, setGenerationSpecies] = useState(initialSpecies);
  const [selectedId, setSelectedId] = useState(pokemon[0]?.id);
  const [activeTab, setActiveTab] = useState('data');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [generation, setGeneration] = useState('1');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const selected = pokemonList.find(({ id }) => id === selectedId) ?? pokemonList[0];
  const visiblePokemon = pokemonList.filter(({ name, id }) => `${name} ${number(id)}`.includes(appliedQuery.toLowerCase().trim()));
  const pageCount = Math.max(1, Math.ceil(generationSpecies.length / LIMIT));

  if (!selected) return <main className={styles.empty}>No fue posible cargar la Pokédex.</main>;

  const index = pokemonList.findIndex(({ id }) => id === selected.id);
  const selectRelative = (offset) => setSelectedId(pokemonList[(index + offset + pokemonList.length) % pokemonList.length].id);
  const artwork = selected.sprites.other?.['official-artwork']?.front_default || selected.sprites.front_default;
  const loadPage = async (nextPage, species = generationSpecies) => {
    setIsLoading(true);
    try {
      const start = (nextPage - 1) * LIMIT;
      const records = await Promise.all(species.slice(start, start + LIMIT).map(({ url }) => pokemonRecord(url)));
      setPokemonList(records); setSelectedId(records[0]?.id); setPage(nextPage); setActiveTab('data');
    } finally { setIsLoading(false); }
  };
  const loadGeneration = async (nextGeneration) => {
    setGeneration(nextGeneration); setIsLoading(true); setAppliedQuery(''); setQuery('');
    try {
      const { data } = await pokeApi.get(`/generation/${nextGeneration}`);
      setGenerationSpecies(data.pokemon_species);
      await loadPage(1, data.pokemon_species);
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <Head><title>Pokédex · Kanto archive</title><meta name="description" content="Pokédex powered by PokéAPI" /></Head>
      <main className={styles.page}>
        <section className={styles.pokedex} aria-label="Pokédex de Kanto">
          <aside className={styles.sidebar}>
            <div className={styles.brand}><svg aria-hidden="true" className={styles.brandIcon} viewBox="0 0 32 32"><path d="M3 16a13 13 0 0 1 26 0H3Z" fill="#ef493e" /><path d="M3 16h26a13 13 0 0 1-26 0Z" fill="#f5f1e9" /><path d="M3 16h26" stroke="#20272f" strokeWidth="3" /><circle cx="16" cy="16" r="5" fill="#f5f1e9" stroke="#20272f" strokeWidth="3" /></svg><div><strong>POKÉDEX</strong><small>KANTO ARCHIVE</small></div><button aria-expanded={isMenuOpen} aria-label="Abrir menú" className={styles.menuButton} onClick={() => setIsMenuOpen((open) => !open)} type="button"><span /><span /><span /></button></div>
            {isMenuOpen && <div className={styles.menuPanel}>
              <form onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }}><label htmlFor="pokemon-search">BUSCAR POKÉMON</label><div className={styles.searchRow}><input id="pokemon-search" onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o número" type="search" value={query} /><button type="submit">Buscar</button></div></form>
              <label htmlFor="generation-select">GENERACIÓN</label>
              <select disabled={isLoading} id="generation-select" onChange={(event) => loadGeneration(event.target.value)} value={generation}>{Object.entries(GENERATIONS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
              <small>{isLoading ? 'Cargando registros…' : `${generationSpecies.length} especies · página ${page} de ${pageCount}.`}</small>
            </div>}
            <p className={styles.sideLabel}>REGISTRO DE ESPECIES</p>
            <div className={styles.list}>
              {visiblePokemon.map((entry) => (
                <button className={`${styles.listItem} ${entry.id === selected.id ? styles.active : ''}`} key={entry.id} onClick={() => setSelectedId(entry.id)} type="button">
                  <span>{number(entry.id)}</span><Image alt="" height={34} src={entry.sprites.front_default} width={34} /><strong>{label(entry.name)}</strong><b>›</b>
                </button>
              ))}
              {!visiblePokemon.length && <p className={styles.noResults}>Sin coincidencias.</p>}
            </div>
            {pageCount > 1 && <nav aria-label="Paginación" className={styles.pagination}><button aria-label="Página anterior" disabled={page === 1 || isLoading} onClick={() => loadPage(page - 1)} type="button">‹</button><span>{page} / {pageCount}</span><button aria-label="Página siguiente" disabled={page === pageCount || isLoading} onClick={() => loadPage(page + 1)} type="button">›</button></nav>}
          </aside>

          <section className={styles.profile}>
            <header className={styles.profileHeader}>
              <div><p>N.º {number(selected.id)}</p><h1>{label(selected.name)}</h1><span>Registro de especie Pokémon</span></div>
              <div className={styles.badges}>{selected.types.map(({ type }) => <span className={`${styles.badge} ${styles[`type${type.name}`] || styles.typeDefault}`} key={type.name}>{label(type.name)}</span>)}</div>
            </header>
            <div className={styles.stage}>
              <button aria-label="Pokémon anterior" className={styles.arrow} onClick={() => selectRelative(-1)} type="button">‹</button>
              <i className={styles.halo} /><Image alt={label(selected.name)} className={styles.artwork} height={380} priority src={artwork} width={390} />
              <button aria-label="Pokémon siguiente" className={styles.arrow} onClick={() => selectRelative(1)} type="button">›</button>
            </div>
            <div className={styles.selector}>
              {pokemonList.slice(Math.max(0, index - 1), index + 2).map((entry) => (
                <button className={`${styles.mini} ${entry.id === selected.id ? styles.miniActive : ''}`} key={entry.id} onClick={() => setSelectedId(entry.id)} type="button"><Image alt={label(entry.name)} height={58} src={entry.sprites.front_default} width={60} /><small>{number(entry.id)}</small></button>
              ))}
            </div>
          </section>

          <section className={styles.details}>
            <header className={styles.detailsHeader} role="tablist" aria-label="Información del Pokémon">
              <button aria-selected={activeTab === 'data'} className={activeTab === 'data' ? styles.activeTab : ''} onClick={() => setActiveTab('data')} role="tab" type="button">DATOS</button>
              <button aria-selected={activeTab === 'stats'} className={activeTab === 'stats' ? styles.activeTab : ''} onClick={() => setActiveTab('stats')} role="tab" type="button">ESTADÍSTICAS</button>
              <button aria-selected={activeTab === 'more'} className={activeTab === 'more' ? styles.activeTab : ''} onClick={() => setActiveTab('more')} role="tab" type="button">MÁS</button>
            </header>

            {activeTab === 'data' ? (
              <>
                <p className={styles.summary}>Información general registrada para {label(selected.name)} en la región de Kanto.</p>
                <dl className={styles.data}>
                  <div><dt>Altura</dt><dd>{selected.height / 10} m</dd></div><div><dt>Peso</dt><dd>{selected.weight / 10} kg</dd></div>
                  <div><dt>Habilidad</dt><dd>{label(selected.abilities[0]?.ability.name || 'Desconocida')}</dd></div><div><dt>Experiencia</dt><dd>{selected.base_experience ?? '—'}</dd></div>
                  <div><dt>Número de registro</dt><dd>#{number(selected.id)}</dd></div>
                </dl>
                <div className={styles.types}><h2>TIPO</h2>{selected.types.map(({ type }) => <span className={`${styles.badge} ${styles[`type${type.name}`] || styles.typeDefault}`} key={type.name}>{label(type.name)}</span>)}</div>
              </>
            ) : activeTab === 'stats' ? (
              <div className={styles.statPanel}>
                <p className={styles.summary}>Valores base de combate para {label(selected.name)}.</p>
                <div className={styles.stats}>{selected.stats.map(({ base_stat: value, stat }) => <div className={styles.stat} key={stat.name}><span>{label(stat.name)}</span><i><b style={{ width: `${Math.min(value, 100)}%` }} /></i><strong>{value}</strong></div>)}</div>
              </div>
            ) : (
              <div className={styles.morePanel}>
                <section><h2>HABILIDADES</h2>{selected.abilities.map(({ ability, is_hidden }) => <p className={styles.infoPill} key={ability.name}>{label(ability.name)} {is_hidden && <small>OCULTA</small>}</p>)}</section>
                <section><h2>MOVIMIENTOS</h2><div className={styles.moves}>{selected.moves.map((move) => <div key={move.name}><strong>{label(move.name)}</strong><span>Nivel {move.level} · {label(move.method)}</span></div>)}</div></section>
                <section><h2>PERFIL</h2><p className={styles.profileCopy}>{selected.species.description || 'Sin descripción disponible.'}</p><p className={styles.meta}>Color: {label(selected.species.color)} · Hábitat: {label(selected.species.habitat || 'desconocido')} · Orden: {selected.order}</p></section>
                <section><h2>GALERÍA</h2><div className={styles.gallery}>{Object.entries(selected.sprites.gallery).filter(([, src]) => src).map(([name, src]) => <Image alt={`${label(selected.name)} ${label(name)}`} height={62} key={name} src={src} width={62} />)}</div></section>
                <section><h2>EVOLUCIONES</h2><div className={styles.evolutions}>{selected.evolution.map((entry, evolutionIndex) => <span key={entry.id}>{evolutionIndex > 0 && <b>›</b>}<Image alt={label(entry.name)} height={42} src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`} width={42} /><small>{label(entry.name)}</small></span>)}</div></section>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  try {
    const { data } = await pokeApi.get(`/pokemon?limit=${LIMIT}`);
    const { data: generation } = await pokeApi.get('/generation/1');
    const pokemon = await Promise.all(data.results.map(({ url }) => pokemonRecord(url)));
    return { props: { pokemon, initialSpecies: generation.pokemon_species }, revalidate: 86_400 };
  } catch {
    return { props: { pokemon: [], initialSpecies: [] }, revalidate: 60 };
  }
}
