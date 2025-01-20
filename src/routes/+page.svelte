<script lang="ts">
  let recording = false; // Indique si l'enregistrement est en cours.
  let mediaRecorder: MediaRecorder | null = null; // Objet qui gère l'enregistrement audio via l'API MediaRecorder.
  let audioChunks: Blob[] = []; // Tableau pour stocker les fragments audio capturés lors de l'enregistrement.
  let transcriptions = []; // Contient les transcriptions de l'audio enregistré, une fois traitées par l'API.
  let loading = false; // Variable qui indique si une requête API est en cours (pour la transcription de l'audio).

  // Fonction qui démarre l'enregistrement audio lorsque l'utilisateur clique sur le bouton.
  async function startRecording() {
    console.log("Démarrage de l'enregistrement...");
    try {
      // Demande l'accès au microphone de l'utilisateur.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone accédé avec succès.");

      // Initialise le MediaRecorder avec le flux audio obtenu.
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = []; // Réinitialise les fragments audio avant de commencer un nouvel enregistrement.

      // Lorsqu'il y a des données disponibles (lorsqu'un fragment audio est capturé), on les stocke dans `audioChunks`.
      mediaRecorder.ondataavailable = (event) => {
        console.log("Données audio disponibles.");
        audioChunks.push(event.data);
      };

      // Lorsque l'enregistrement est arrêté, cette fonction est appelée.
      mediaRecorder.onstop = async () => {
        console.log("Enregistrement arrêté.");
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // Crée un Blob avec les fragments audio.
        await processAudio(audioBlob); // Appelle la fonction pour traiter l'audio (envoi à l'API de transcription).
      };

      // Démarre l'enregistrement audio.
      mediaRecorder.start();
      console.log("Enregistrement démarré.");
      recording = true; // L'enregistrement est maintenant en cours.
    } catch (error) {
      console.error('Error accessing microphone:', error); // Si une erreur se produit lors de l'accès au microphone.
    }
  }

  // Fonction qui arrête l'enregistrement lorsque l'utilisateur clique sur le bouton.
  function stopRecording() {
    if (mediaRecorder && recording) {
      console.log("Arrêt de l'enregistrement...");
      mediaRecorder.stop(); // Arrête l'enregistrement et déclenche `onstop`.
      recording = false; // L'enregistrement est maintenant terminé.
    }
  }

  // Fonction qui envoie l'audio capturé à l'API pour le traitement (transcription).
  async function processAudio(audioBlob: Blob) {
    console.log("Traitement de l'audio...");
    loading = true; // Lancement de la requête API pour la transcription.
    try {
      const formData = new FormData(); // Crée un objet FormData pour envoyer des données dans la requête.
      formData.append('audio', audioBlob); // Ajoute le fichier audio sous la clé 'audio'.
      formData.append('role', 'user'); // Ajoute un rôle à l'audio (dans ce cas 'user').

      console.log("Envoi de la requête API pour transcription...");
      const response = await fetch('/api/transcribe', { // Envoie une requête POST à l'API.
        method: 'POST',
        body: formData, // Le corps de la requête contient le fichier audio.
      });

      const data = await response.json(); // Lit la réponse JSON renvoyée par l'API.
      console.log("Réponse reçue de l'API:", data);
      transcriptions = data.transcriptions; // Récupère les transcriptions et les stocke dans la variable `transcriptions`.

    } catch (error) {
      console.error('Error processing audio:', error); // Gestion des erreurs si l'envoi ou le traitement échoue.
    } finally {
      loading = false; // Fin du traitement.
      console.log("Traitement terminé.");
    }
  }

  // Fonction qui met à jour la réponse à une transcription dans l'historique des messages.
  function setResponse(index: number, response: string) {
    console.log("Mise à jour de la réponse...");
    // Met à jour le message de réponse dans `transcriptions` à l'index spécifié.
    transcriptions[index].text = response;
    console.log("Réponse mise à jour.");
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-8">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-4xl font-bold mb-8">Assistant Vocal</h1>

    <div class="space-y-6">
      <div class="flex justify-center">
        <!-- Bouton pour démarrer/arrêter l'enregistrement -->
        <button
          class={`p-6 rounded-full ${recording ? "bg-red-600" : "bg-blue-600"} hover:opacity-90 transition-opacity`}
          on:click={recording ? stopRecording : startRecording}
        >
          {#if loading}
            <!-- Indicateur de chargement pendant que l'API traite l'audio -->
            <div class="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
          {:else}
            <!-- Icône d'enregistrement (microphone) ou arrêt (carré) -->
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if recording}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              {/if}
            </svg>
          {/if}
        </button>
      </div>

      <!-- Affichage du chat historique (messages) -->
      <div class="space-y-4">
        {#each transcriptions as { role, text }, index}
          <!-- Affiche chaque message selon le rôle de l'utilisateur (user) ou du bot -->
          <div class={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div class={`bg-${role === 'user' ? 'blue' : 'gray'}-800 p-4 rounded-lg text-white max-w-xs`}>
              <p class="text-sm font-semibold">{role === 'user' ? 'User' : 'Bot'}</p>
              <p>{text}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
