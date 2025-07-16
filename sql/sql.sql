-- Remover tabelas existentes (se houver)
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS user_config;
DROP TABLE IF EXISTS fixed_expenses;
DROP TABLE IF EXISTS savings;
DROP TABLE IF EXISTS purchase_history;

-- Criar tabelas SEM RLS para desenvolvimento
CREATE TABLE user_config (
    id SERIAL PRIMARY KEY,
    monthly_income DECIMAL(10,2) DEFAULT 0,
    closing_day INTEGER DEFAULT 15,
    purchase_history JSONB DEFAULT '[]'::jsonb, -- Campo para histórico (opcional)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fixed_expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    is_installment BOOLEAN DEFAULT FALSE,
    installment_count INTEGER,
    installment_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE savings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    goal DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ NOVA TABELA: Histórico de compras parceladas
CREATE TABLE purchase_history (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    installment_count INTEGER NOT NULL,
    installment_value DECIMAL(10,2) NOT NULL,
    purchase_date TIMESTAMP NOT NULL DEFAULT NOW(),
    first_installment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE purchase_history IS 'Histórico de compras parceladas existentes no cartão';
COMMENT ON COLUMN purchase_history.description IS 'Descrição da compra parcelada';
COMMENT ON COLUMN purchase_history.total_amount IS 'Valor total da compra';
COMMENT ON COLUMN purchase_history.installment_count IS 'Número total de parcelas';
COMMENT ON COLUMN purchase_history.installment_value IS 'Valor de cada parcela';
COMMENT ON COLUMN purchase_history.purchase_date IS 'Data da compra original';
COMMENT ON COLUMN purchase_history.first_installment_date IS 'Data da primeira parcela';
COMMENT ON COLUMN purchase_history.is_active IS 'Se a compra ainda está ativa (gerando parcelas)';

-- Criar índices para melhor performance
CREATE INDEX idx_purchase_history_active ON purchase_history(is_active);
CREATE INDEX idx_purchase_history_first_installment ON purchase_history(first_installment_date);
CREATE INDEX idx_purchase_history_created_at ON purchase_history(created_at);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expenses_payment_method ON expenses(payment_method);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_user_config_updated_at 
    BEFORE UPDATE ON user_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_history_updated_at 
    BEFORE UPDATE ON purchase_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Confirmar que RLS está desabilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('expenses', 'user_config', 'fixed_expenses', 'savings', 'purchase_history');

-- ✅ DADOS DE EXEMPLO para testar (opcional)
-- Descomente as linhas abaixo se quiser dados de teste

/*
-- Configuração inicial
INSERT INTO user_config (monthly_income, closing_day) 
VALUES (5000.00, 15);

-- Alguns gastos fixos de exemplo
INSERT INTO fixed_expenses (name, amount) VALUES 
('Aluguel', 1200.00),
('Internet', 89.90),
('Seguro do Carro', 150.00);

-- Algumas caixinhas de exemplo
INSERT INTO savings (name, goal, current_amount) VALUES 
('Emergência', 10000.00, 2500.00),
('Viagem', 3000.00, 800.00);

-- Exemplo de compra parcelada
INSERT INTO purchase_history (description, total_amount, installment_count, installment_value, first_installment_date) 
VALUES ('iPhone 15 Pro', 6000.00, 12, 500.00, '2024-01-15');
*/

-- Verificar estrutura criada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('expenses', 'user_config', 'fixed_expenses', 'savings', 'purchase_history')
ORDER BY table_name, ordinal_position;