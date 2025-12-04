import { clearActiveUser } from "./storage.js";

const $ = (selector) => document.querySelector(selector);

export function wireAuthButtons(state, callbacks) {
  $("#login")?.addEventListener("click", () => {
    window.location.href = "./signup.html";
  });

  $("#signup")?.addEventListener("click", () => {
    window.location.href = "./signup.html";
  });

  $("#logout")?.addEventListener("click", () => {
    callbacks.persistNotes();
    clearActiveUser();
    state.activeUser = null;
    callbacks.loadNotesForCurrentUser();
    callbacks.updateUserDisplay();
    callbacks.renderNotesList();
    callbacks.renderActiveNote();
    window.location.href = "./signup.html";
  });
}