<script setup lang="ts">
type Health = { status: string; neo4j: 'up' | 'down' };

const state = ref<'loading' | 'error' | Health>('loading');

onMounted(async () => {
  try {
    // 503 still carries a useful body (Neo4j down), so don't throw on it.
    state.value = await useApi()<Health>('/health', { ignoreResponseError: true });
  } catch {
    state.value = 'error';
  }
});
</script>

<template>
  <main class="mx-auto max-w-xl p-8">
    <h1 class="text-2xl font-semibold">Battery Passport</h1>
    <p class="mt-1 text-slate-600">Passeport numérique de batterie – PoC défi 6</p>

    <section class="mt-6 rounded-lg border border-slate-200 p-4" aria-live="polite">
      <h2 class="font-medium">État du service</h2>
      <p v-if="state === 'loading'" class="mt-2">Vérification en cours…</p>
      <p v-else-if="state === 'error'" class="mt-2 text-red-700">✖ API injoignable</p>
      <ul v-else class="mt-2 space-y-1">
        <li :class="state.status === 'ok' ? 'text-green-700' : 'text-red-700'">
          {{ state.status === 'ok' ? '✔' : '✖' }} API :
          {{ state.status === 'ok' ? 'opérationnelle' : 'dégradée' }}
        </li>
        <li :class="state.neo4j === 'up' ? 'text-green-700' : 'text-red-700'">
          {{ state.neo4j === 'up' ? '✔' : '✖' }} Base Neo4j :
          {{ state.neo4j === 'up' ? 'disponible' : 'indisponible' }}
        </li>
      </ul>
    </section>
  </main>
</template>
