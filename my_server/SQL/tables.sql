create table @ZTKA_TEST_LOGIN_USERS(
	Code SERIAL primary key, 
    FullName VARCHAR(255),
    UserName VARCHAR(255),
	password VARCHAR (255), 
	Email VARCHAR(255),
	active BOOLEAN,
	Mobile VARCHAR(20),
	CreatedDateTime TIMESTAMP default current_timestamp,
    UserManager BOOLEAN
);


create table @ZTKA_TEST_QRCODE(
	Code SERIAL primary key, 
    UserId INT,
	foreign key (UserId) references @ZTKA_TEST_LOGIN_USERS(Code),
	CreatedDateTime TIMESTAMP default current_timestamp,
	QrCode TEXT

);