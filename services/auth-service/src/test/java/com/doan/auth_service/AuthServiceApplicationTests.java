package com.doan.auth_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"JWT_SECRET=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
		"spring.data.mongodb.auto-index-creation=false"
})
class AuthServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
