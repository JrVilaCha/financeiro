// Inicializar aplicação quando DOM estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  // Elementos do DOM
  const form = document.getElementById("expense-form");
  const installmentSection = document.getElementById("installment-section");
  const amountInput = document.getElementById("amount");
  const installmentCountInput = document.getElementById("installment-count");
  const installmentValueInput = document.getElementById("installment-value");
  const submitBtn = document.getElementById("submit-btn");
  const successMessage = document.getElementById("success-message");
  const errorMessage = document.getElementById("error-message");

  // Inicializar eventos
  initializeEventListeners();

  // Focar no primeiro campo
  document.getElementById("description").focus();

  // =====================================
  // EVENT LISTENERS
  // =====================================

  function initializeEventListeners() {
    // Controlar exibição da seção de parcelamento
    document
      .querySelectorAll('input[name="payment_method"]')
      .forEach((radio) => {
        radio.addEventListener("change", handlePaymentMethodChange);
      });

    // Calcular valor da parcela
    amountInput.addEventListener("input", calculateInstallmentValue);
    installmentCountInput.addEventListener("change", calculateInstallmentValue);

    // Enviar formulário
    form.addEventListener("submit", handleFormSubmit);
  }

  // =====================================
  // HANDLERS
  // =====================================

  function handlePaymentMethodChange() {
    console.log("Forma de pagamento selecionada:", this.value);

    if (this.value === "credito") {
      installmentSection.classList.add("active");
      installmentCountInput.required = true;
      console.log("Seção de parcelamento ativada");
    } else {
      installmentSection.classList.remove("active");
      installmentCountInput.required = false;
      installmentCountInput.value = "";
      installmentValueInput.value = "";
      console.log("Seção de parcelamento desativada");
    }
  }

  function calculateInstallmentValue() {
    const amount = parseFloat(amountInput.value) || 0;
    const installmentCount = parseInt(installmentCountInput.value) || 0;

    console.log("Calculando:", amount, "em", installmentCount, "parcelas");

    if (amount > 0 && installmentCount > 0) {
      const installmentValue = amount / installmentCount;
      installmentValueInput.value = installmentValue.toFixed(2);
      console.log("Valor da parcela:", installmentValue.toFixed(2));
    } else {
      installmentValueInput.value = "";
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    setLoadingState(true);
    hideMessages();

    try {
      const expenseData = collectFormData();
      validateFormData(expenseData);

      console.log("✅ Validações passaram, enviando para API...");
      await saveExpense(expenseData);

      showSuccessMessage("Gasto cadastrado com sucesso!");
      resetForm();
    } catch (error) {
      console.error("❌ Erro completo:", error);
      showErrorMessage(error.message || "Erro ao cadastrar gasto");
    } finally {
      setLoadingState(false);
    }
  }

  // =====================================
  // FUNÇÕES AUXILIARES
  // =====================================

  function collectFormData() {
    const formData = new FormData(form);

    // Debug: verificar todos os valores coletados
    console.log("📋 Dados do formulário:");
    console.log("- description:", formData.get("description"));
    console.log("- amount:", formData.get("amount"));
    console.log("- payment_method:", formData.get("payment_method"));
    console.log("- installment_count:", installmentCountInput.value);
    console.log("- installment_value:", installmentValueInput.value);

    // Gerar timestamp automático no momento do cadastro
    const now = new Date();
    const timestamp = now.toISOString();

    console.log("🕐 Timestamp gerado automaticamente:", timestamp);

    const expenseData = {
      description: formData.get("description"),
      amount: parseFloat(formData.get("amount")),
      payment_method: formData.get("payment_method"),
      is_installment:
        formData.get("payment_method") === "credito" &&
        installmentCountInput.value > 1,
      installment_count:
        formData.get("payment_method") === "credito"
          ? parseInt(installmentCountInput.value)
          : null,
      installment_value:
        formData.get("payment_method") === "credito" &&
        installmentCountInput.value > 1
          ? parseFloat(installmentValueInput.value)
          : null,
      created_at: timestamp,
    };

    console.log("🔍 Dados processados:", expenseData);
    return expenseData;
  }

  function validateFormData(expenseData) {
    if (!expenseData.description) {
      throw new Error("Descrição é obrigatória");
    }

    if (!expenseData.amount || isNaN(expenseData.amount)) {
      throw new Error("Valor é obrigatório e deve ser um número válido");
    }

    if (!expenseData.payment_method) {
      throw new Error("Forma de pagamento é obrigatória");
    }

    if (
      expenseData.payment_method === "credito" &&
      (!expenseData.installment_count || expenseData.installment_count < 1)
    ) {
      throw new Error(
        "Selecione o número de parcelas para pagamentos no crédito"
      );
    }
  }

  async function saveExpense(expenseData) {
    console.log("🚀 Enviando dados para API:", expenseData);

    // Usar URL absoluta para garantir que vai para o endpoint correto
    const apiUrl = `${window.location.origin}/api/expenses`;
    console.log("📍 URL completa da requisição:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      console.log("📡 Resposta da API:", response.status, response.statusText);
      console.log("🔗 URL final:", response.url);

      const result = await response.json();
      console.log("📋 Dados retornados:", result);

      if (!response.ok) {
        console.error("❌ Erro HTTP:", response.status, result);
        throw new Error(result.error || "Erro ao salvar gasto");
      }

      return result;
    } catch (error) {
      console.error("❌ Erro na requisição:", error);
      console.log("🔍 Dados enviados eram:", expenseData);
      throw error;
    }
  }

  function setLoadingState(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? "Salvando..." : "Cadastrar Gasto";
  }

  function resetForm() {
    form.reset();
    installmentSection.classList.remove("active");
    document.getElementById("description").focus();
  }

  function showSuccessMessage(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 5000);
  }

  function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 5000);
  }

  function hideMessages() {
    successMessage.style.display = "none";
    errorMessage.style.display = "none";
  }
});
