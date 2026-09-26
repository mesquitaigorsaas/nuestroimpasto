-- Login com Google: identificador fixo da conta Google (o e-mail pode mudar).
alter table users add column google_sub text unique;
