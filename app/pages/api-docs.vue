<template>
  <div class="p-8 max-w-4xl mx-auto my-8">
    <h1 class="text-2xl font-bold mb-4">API Documentation</h1>
    <p class="mb-4">Welcome to the API documentation for DataPantry. Here you will find information on how to use the API.</p>

    <h2 class="text-xl font-bold mb-2">Getting Started</h2>
    <p class="mb-4">To get started with the API, you will need an API key. You can obtain one by signing up for an account.</p>

    <h2 class="text-xl font-bold mb-2">Endpoints</h2>
    <ul class="list-disc list-inside mb-4">
      <li><strong>GET /api/databases</strong> - Retrieve a list of databases</li>
      <li><strong>POST /api/databases</strong> - Create a new database</li>
      <li><strong>DELETE /api/databases/:id</strong> - Delete a database</li>
    </ul>

    <h2 class="text-xl font-bold mb-2">Authentication</h2>
    <p class="mb-4">All API requests require authentication. You can authenticate by including your API key in the request headers.</p>

    <h2 class="text-xl font-bold mb-2">Error Handling</h2>
    <p class="mb-4">If an error occurs, the API will return a JSON response with an error message.</p>
  </div>
</template>