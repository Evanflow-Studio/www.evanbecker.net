<script setup lang="ts">
import { ref } from 'vue'

const tabs = [
  {
    name: 'InfisicalConfigProvider.cs',
    language: 'csharp',
    code: `// Custom .NET config provider — pulls secrets at startup
public class InfisicalConfigurationProvider : ConfigurationProvider
{
    private static readonly Dictionary<string, string> KeyMap = new()
    {
        ["DB_CONNECTION_STRING"] = "ConnectionStrings:Database",
        ["AUTH0_DOMAIN"]         = "Auth0:Domain",
        ["AUTH0_AUDIENCE"]       = "Auth0:Audience",
        ["AUTH0_CLIENT_SECRET"]  = "Auth0:ClientSecret",
    };

    public override void Load()
    {
        var clientId = Environment.GetEnvironmentVariable(
            "INFISICAL_CLIENT_ID");
        if (string.IsNullOrEmpty(clientId)) return; // local dev

        var token = Authenticate(address, clientId, clientSecret);
        var secrets = FetchSecrets(token, projectId, environment);

        foreach (var secret in secrets)
            if (KeyMap.TryGetValue(secret.Key, out var path))
                Data[path] = secret.Value;
    }
}`,
  },
  {
    name: 'deploy.yml',
    language: 'yaml',
    code: `# Self-hosted CI — push to main, Watchtower picks it up
name: Build & Deploy Prod

on:
  push:
    branches: [ "main" ]

jobs:
  build_and_push:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Build images
        run: |
          docker build -t evanbecker-api:latest .
          docker build -t evanbecker-client:latest .

      - name: Push to local registry
        run: |
          docker push registry/evanbecker-api:latest
          docker push registry/evanbecker-client:latest

      # Watchtower detects new images within 30s
      # No SSH, no kubectl, no manual deploys`,
  },
]

const activeTab = ref(tabs[0])

function lineNumbers(code: string) {
  return code.split('\n').map((_, i) => String(i + 1).padStart(2, '0'))
}

function highlightCode(code: string, language: string) {
  // Tokenize then reassemble to avoid regex collisions
  const lines = code.split('\n')
  return lines.map(line => highlightLine(line, language)).join('\n')
}

function highlightLine(line: string, language: string): string {
  // Handle full-line comments first (// for C#, # for yaml)
  const commentMatch = line.match(/^(\s*)(\/\/.*)$/) || line.match(/^(\s*)(#.*)$/)
  if (commentMatch) {
    return commentMatch[1] + '<span class="text-slate-500">' + esc(commentMatch[2]) + '</span>'
  }

  const tokens: string[] = []
  // Tokenize by strings, then words, then other chars
  const re = /("(?:[^"\\]|\\.)*")|(\b[A-Za-z_]\w*\b)|(\d+\.?\d*f?)|([^\w"]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m[1]) {
      // String literal
      tokens.push('<span class="text-emerald-400">' + esc(m[1]) + '</span>')
    } else if (m[2]) {
      // Word — classify it
      tokens.push(classifyWord(m[2], language))
    } else if (m[3]) {
      // Number
      tokens.push('<span class="text-amber-300">' + esc(m[3]) + '</span>')
    } else {
      tokens.push(esc(m[4]))
    }
  }
  return tokens.join('')
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const KEYWORDS = new Set([
  'public', 'private', 'readonly', 'class', 'async', 'await', 'return',
  'var', 'const', 'new', 'void', 'using', 'namespace', 'static',
  'override', 'virtual', 'abstract', 'interface', 'float', 'int',
  'string', 'bool', 'struct', 'auto', 'where', 'default', 'init',
  'if', 'out', 'foreach', 'in',
  'name', 'on', 'push', 'branches', 'jobs', 'steps', 'uses', 'run',
  'true', 'false',
])

const TYPES = new Set([
  'ConfigurationProvider', 'Dictionary', 'Environment',
  'InfisicalConfigurationProvider', 'Data', 'KeyMap',
])

const ATTRS = new Set([
  'ApiController', 'Route', 'HttpGet',
])

function classifyWord(word: string, _lang: string): string {
  if (KEYWORDS.has(word)) return '<span class="text-[#41A5F7]">' + word + '</span>'
  if (TYPES.has(word)) return '<span class="text-emerald-300">' + word + '</span>'
  if (ATTRS.has(word)) return '<span class="text-[#2D95FC]">' + word + '</span>'
  return esc(word)
}
</script>

<template>
  <div class="relative max-w-2xl">
    <!-- Glow effect -->
    <div class="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#0C65E5]/20 via-[#2D95FC]/10 to-[#41A5F7]/20 opacity-60 blur-xl" />

    <div class="relative rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 dark:bg-[#0B1120] dark:ring-slate-800">
      <!-- Title bar -->
      <div class="flex items-center gap-2 px-4 pt-4">
        <div class="flex gap-1.5">
          <div class="h-3 w-3 rounded-full bg-slate-700/50" />
          <div class="h-3 w-3 rounded-full bg-slate-700/50" />
          <div class="h-3 w-3 rounded-full bg-slate-700/50" />
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-4 flex gap-2 px-4 text-xs">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="activeTab = tab"
          :class="[
            'rounded-full px-3 py-1 transition',
            activeTab.name === tab.name
              ? 'bg-[#2D95FC]/20 font-medium text-[#41A5F7] ring-1 ring-[#2D95FC]/30'
              : 'text-slate-500 hover:text-slate-300',
          ]"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Code -->
      <div class="mt-4 flex items-start overflow-x-auto px-4 pb-6 text-sm">
        <div class="select-none border-r border-slate-700/30 pr-4 font-mono text-slate-600" aria-hidden="true">
          <div v-for="num in lineNumbers(activeTab.code)" :key="num">{{ num }}</div>
        </div>
        <pre class="flex-1 overflow-x-auto pl-4 font-mono"><code class="text-slate-300" v-html="highlightCode(activeTab.code, activeTab.language)"></code></pre>
      </div>
    </div>
  </div>
</template>
