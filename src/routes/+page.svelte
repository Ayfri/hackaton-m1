<script lang="ts">
  import { afterUpdate } from 'svelte'; // Importation de la fonction afterUpdate de Svelte

  let recording = false; // État de l'enregistrement, initialement faux
  let mediaRecorder: MediaRecorder | null = null; // L'instance de MediaRecorder, qui sera utilisée pour enregistrer l'audio
  let audioChunks: Blob[] = []; // Tableau qui stockera les morceaux d'audio capturés
  let extractedLinkState: boolean = false; // Indicateur pour savoir si un lien a été extrait
  let transcriptions: string = ""; // Texte des transcriptions retournées par l'API
  let loading = false; // Indicateur de chargement pendant que l'audio est traité
  let extractedLink = ""; // Variable pour stocker le lien extrait de la réponse API

  // Fonction pour fermer le popup qui montre le lien extrait
  function closePopup() {
    extractedLinkState = false; // Fermeture du popup en réinitialisant l'état
  }

  // Fonction pour démarrer l'enregistrement audio
  async function startRecording() {
    console.log("Démarrage de l'enregistrement...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Demande d'accès au micro
      console.log("Microphone accédé avec succès.");
      mediaRecorder = new MediaRecorder(stream); // Création d'une instance MediaRecorder
      audioChunks = []; // Réinitialisation du tableau audioChunks
      mediaRecorder.ondataavailable = (event) => { // Événement déclenché à chaque fois qu'une partie de l'audio est disponible
        console.log("Données audio disponibles.");
        audioChunks.push(event.data); // Ajout des données audio dans le tableau
      };
      mediaRecorder.onstop = async () => { // Événement déclenché lorsque l'enregistrement est arrêté
        console.log("Enregistrement arrêté.");
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // Création d'un Blob à partir des morceaux d'audio
        await processAudio(audioBlob); // Appel à la fonction pour traiter l'audio
      };
      mediaRecorder.start(); // Démarrage de l'enregistrement
      console.log("Enregistrement démarré.");
      recording = true; // Mise à jour de l'état pour indiquer que l'enregistrement est en cours
    } catch (error) {
      console.error('Error accessing microphone:', error); // Gestion des erreurs si l'accès au micro échoue
    }
  }

  // Fonction pour arrêter l'enregistrement
  function stopRecording() {
    if (mediaRecorder && recording) { // Vérification si l'enregistrement est en cours
      console.log("Arrêt de l'enregistrement...");
      mediaRecorder.stop(); // Arrêt de l'enregistrement
      recording = false; // Mise à jour de l'état pour indiquer que l'enregistrement est arrêté
    }
  }

  async function processAudio(audioBlob: Blob) {
  console.log("Traitement de l'audio...");
  loading = true; // Mise à jour de l'état pour indiquer que l'audio est en train de se traiter
  try {
    const formData = new FormData(); // Création d'un objet FormData pour envoyer l'audio à l'API
    formData.append('audio', audioBlob); // Ajout du fichier audio dans le FormData
    formData.append('role', 'user'); // Ajout du rôle (ici 'user')
    console.log("Envoi de la requête API pour transcription...");
    const response = await fetch('/api/transcribe', { // Envoi de la requête POST à l'API
      method: 'POST',
      body: formData,
    });

    const data = await response.json(); // Traitement de la réponse JSON de l'API
    console.log("Réponse reçue de l'API:", data);
    transcriptions = data.transcriptions; // Stockage des transcriptions retournées par l'API

    // Vérifier si 'botReply' est défini et extraire le lien
    if (data.botReply) {
      const linkMatch = data.botReply.match(/https?:\/\/[^\s]+/); // Expression régulière pour trouver un lien
      if (linkMatch) {
        extractedLinkState = true; // Mise à jour de l'état pour afficher le lien
        extractedLink = linkMatch[0]; // Mise à jour de la variable extractedLink avec le lien extrait
        console.log("Lien extrait: " + extractedLink);
      } else {
        extractedLink = ""; // Aucun lien trouvé, réinitialisation
      }
    } else {
      // Réponse par défaut si 'botReply' est manquant
      extractedLinkState = true; // Afficher une réponse par défaut
      extractedLink = "Désolé, je n'ai pas pu obtenir de réponse. Essaye encore plus tard.";
      console.log("Réponse automatique générée: " + extractedLink);
    }

  } catch (error) {
    console.error('Error processing audio:', error); // Gestion des erreurs lors du traitement de l'audio
  } finally {
    loading = false; // Mise à jour de l'état pour indiquer que le traitement est terminé
    console.log("Traitement terminé.");
  }
}



  // Fonction pour faire défiler la page vers le dernier message
  function scrollToLastMessage() {
    const messagesContainer = document.getElementById('chat-messages'); // Récupération du conteneur des messages
    if (messagesContainer) {
      const lastMessage = messagesContainer.lastElementChild; // Récupération du dernier message
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' }); // Défilement fluide vers le dernier message
      }
    }
  }

  // Utilisation de afterUpdate pour détecter quand les messages sont mis à jour
  afterUpdate(() => {
    scrollToLastMessage(); // Focalisation sur le dernier message après la mise à jour
  });
</script>

<div class="min-h-screen bg-gray-900 text-white flex flex-col">
  <!-- Header fixe en haut -->
  <div class="fixed top-0 left-0 w-full bg-gray-800 p-4 sm:p-6 md:p-8 z-10">
    <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold">Assistant Vocal</h1>
  </div>

  <!-- Espace pour les messages, avec défilement automatique du dernier message -->
  <div class="flex-1 pt-20 sm:pt-24 md:pt-28 lg:pt-32 overflow-y-auto px-4 sm:px-6 md:px-8 pb-20" id="chat-messages">
    <div class="space-y-4">
      {#if extractedLinkState}
      <!-- Popup qui s'affiche quand un lien est extrait -->
      <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-80 text-center">
          <h2 class="text-xl font-bold mb-4">Voulez-vous accéder au site ?</h2>
          <div class="space-x-4">
            <button
              on:click={() => window.open(extractedLink, '_blank')}
              class="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Oui
            </button>
            <button
              on:click={closePopup}
              class="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Non
            </button>
          </div>
        </div>
      </div>
      {/if}
    
      <!-- Affichage des transcriptions -->
      {#each transcriptions as { role, text }, index}
        <!-- Affiche chaque message selon le rôle de l'utilisateur (user) ou du bot -->
        <div class={flex ${role === 'user' ? 'justify-end' : 'justify-start'}}>
          <div class={bg-${role === 'user' ? 'blue' : 'gray'}-800 p-4 rounded-lg text-white max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg}>
            <p class="text-sm sm:text-base md:text-lg font-semibold">{role === 'user' ? 'User' : 'Bot'}</p>
            <p>{text}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Bouton Microphone fixe en bas -->
  <div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 p-6 sm:p-8 md:p-10 lg:p-12">
    <div class="flex justify-center">
      <!-- Bouton pour démarrer/arrêter l'enregistrement -->
      <button
        class={p-6 sm:p-8 rounded-full ${recording ? "bg-red-600" : "bg-blue-600"} hover:opacity-90 transition-opacity}
        on:click={recording ? stopRecording : startRecording}
      >
        {#if loading}
          <!-- Indicateur de chargement pendant que l'API traite l'audio -->
          <div class="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
        {:else}
          <!-- Icône d'enregistrement (microphone) ou arrêt (carré) -->
          <svg class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  </div>
</div>