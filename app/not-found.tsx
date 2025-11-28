"use client";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center px-6 py-10 bg-white shadow-soft rounded-lg">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Oops! A página que procura não existe.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-brown px-6 py-2 text-white transition hover:bg-brown/90"
        >
          Voltar à página inicial
        </a>
      </div>
    </div>
  );
}
