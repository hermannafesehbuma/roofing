-- =============================================================================
-- SUPPORT TICKETS & MESSAGES
-- =============================================================================

CREATE TABLE support_tickets (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT        NOT NULL, -- e.g., '#TI1234'
  client_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  complaint     TEXT        NOT NULL,
  type          TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'pending', 'resolved')),
  priority      TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  location      TEXT        NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX idx_support_tickets_agent_id ON support_tickets(agent_id);

CREATE TABLE support_messages (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_sender_id ON support_messages(sender_id);

-- Trigger for updated_at
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Admins and Managers can see all tickets
CREATE POLICY "Tickets visible to admins/managers"
  ON support_tickets
  FOR SELECT
  USING (auth_user_role() IN ('admin', 'manager'));

-- Clients can only see their own tickets
CREATE POLICY "Tickets visible to clients"
  ON support_tickets
  FOR SELECT
  USING (auth_user_role() = 'client' AND client_id = auth.uid());

-- Admins and Managers can update tickets
CREATE POLICY "Tickets updatable by admins/managers"
  ON support_tickets
  FOR UPDATE
  USING (auth_user_role() IN ('admin', 'manager'));

-- Clients can create tickets
CREATE POLICY "Tickets insertable by clients"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth_user_role() = 'client' AND client_id = auth.uid());

-- Messages inherit visibility from tickets
CREATE POLICY "Messages visible to ticket viewers"
  ON support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_messages.ticket_id
    )
  );

-- Allowed users can insert messages
CREATE POLICY "Messages insertable by participants"
  ON support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_messages.ticket_id
    )
  );
